import { z } from "zod";

import { getSessionUser, isResourceRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  addResourceActivity,
  findResourceTicket,
  getResourceTicketAccess,
  hasDatabaseColumn,
} from "@/lib/resourcePortal";

const allowedStatuses = ["Active", "Blocked", "Awaiting", "QA", "Validation"] as const;
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("edit"), title: z.string().min(1).max(255), description: z.string().max(65535), dueDate: z.string().optional().default("") }),
  z.object({ action: z.literal("status"), status: z.enum(allowedStatuses) }),
  z.object({ action: z.literal("selfAssign") }),
  z.object({ action: z.literal("rename"), title: z.string().trim().min(1).max(255) }),
  z.object({ action: z.literal("undoTitle") }),
  z.object({ action: z.literal("comment"), content: z.string().trim().min(1).max(10000) }),
  z.object({ action: z.literal("addLink"), url: z.string().url().max(2000) }),
]);

async function resourceUser() {
  const user = await getSessionUser();
  return user && isResourceRole(user.role) ? user : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await resourceUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await params;
  const ticket = await findResourceTicket(user, id);
  return ticket ? Response.json(ticket) : Response.json({ error: "Ticket not found." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await resourceUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { id } = await params;
    const access = await getResourceTicketAccess(user, id);
    if (!access || access.lifecycle !== "OPEN") return Response.json({ error: "Ticket not found." }, { status: 404 });
    const values = bodySchema.parse(await request.json());
    const own = access.createdBy === user.id;
    const ownsOrAssigned = own || access.assignedTo === user.id;

    if (values.action === "edit") {
      if (!ownsOrAssigned) return Response.json({ error: "Only the creator or assigned resource can edit this ticket." }, { status: 403 });
      await db.execute("UPDATE tickets SET title = ?, description = ?, deadline = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [values.title, values.description, values.dueDate ? values.dueDate.slice(0, 10) : null, access.databaseId]);
      await addResourceActivity(access.databaseId, user.id, "Edited ticket details", access.status);
    }

    if (values.action === "status") {
      if (!ownsOrAssigned) return Response.json({ error: "Only the creator or assigned resource can change this status." }, { status: 403 });
      await db.execute("UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [values.status, access.databaseId]);
      await addResourceActivity(access.databaseId, user.id, "Changed ticket status", values.status);
    }

    if (values.action === "selfAssign") {
      if (!access.allowSelfAssign || access.assignedTo != null) return Response.json({ error: "Self-assignment is not enabled for this ticket." }, { status: 403 });
      await db.execute("UPDATE tickets SET assigned_to = ?, status = 'Assigned', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [user.id, access.databaseId]);
      await addResourceActivity(access.databaseId, user.id, "Self-assigned ticket", "Assigned");
    }

    if (values.action === "comment") {
      const hasVisibility = await hasDatabaseColumn("comments", "visibility");
      await db.execute(
        hasVisibility ? "INSERT INTO comments (ticket_id, user_id, content, visibility) VALUES (?, ?, ?, 'PUBLIC')" : "INSERT INTO comments (ticket_id, user_id, content) VALUES (?, ?, ?)",
        [access.databaseId, user.id, values.content],
      );
      await addResourceActivity(access.databaseId, user.id, "Added a comment", access.status);
    }

    if (values.action === "rename") {
      if (!own) return Response.json({ error: "Only the creator can rename this ticket." }, { status: 403 });
      const currentHistory = Array.isArray(access.formData.titleHistory)
        ? access.formData.titleHistory.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
      const nextTitle = values.title.trim();
      const currentTitle = access.title.trim();
      if (nextTitle !== currentTitle) {
        await db.execute(
          "UPDATE tickets SET title = ?, form_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          [
            nextTitle,
            JSON.stringify({ ...access.formData, title: nextTitle, titleHistory: [access.title, ...currentHistory].slice(0, 20) }),
            access.databaseId,
          ],
        );
        await addResourceActivity(access.databaseId, user.id, "Renamed ticket", access.status);
      }
    }

    if (values.action === "undoTitle") {
      if (!own) return Response.json({ error: "Only the creator can restore this ticket title." }, { status: 403 });
      const currentHistory = Array.isArray(access.formData.titleHistory)
        ? access.formData.titleHistory.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
      const [previousTitle, ...remainingHistory] = currentHistory;
      if (!previousTitle) {
        return Response.json({ error: "No previous ticket title found." }, { status: 400 });
      }
      await db.execute(
        "UPDATE tickets SET title = ?, form_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [
          previousTitle,
          JSON.stringify({ ...access.formData, title: previousTitle, titleHistory: remainingHistory }),
          access.databaseId,
        ],
      );
      await addResourceActivity(access.databaseId, user.id, "Restored previous ticket title", access.status);
    }

    if (values.action === "addLink") {
      const urls = Array.isArray(access.formData.urls) ? access.formData.urls.filter((item): item is string => typeof item === "string") : [];
      const next = Array.from(new Set([...urls, values.url]));
      await db.execute("UPDATE tickets SET form_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [JSON.stringify({ ...access.formData, urls: next }), access.databaseId]);
      await addResourceActivity(access.databaseId, user.id, "Added a ticket link", access.status);
    }

    return Response.json(await findResourceTicket(user, id));
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid ticket action." }, { status: 400 });
    console.error(error);
    return Response.json({ error: "Unable to update ticket." }, { status: 500 });
  }
}

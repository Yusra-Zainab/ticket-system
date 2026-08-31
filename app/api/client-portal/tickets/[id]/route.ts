import { z } from "zod";

import { getSessionUser, isClientRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  addClientActivity,
  findClientTicket,
  getClientTicketAccess,
} from "@/lib/clientPortal";

const editSchema = z.object({
  action: z.literal("edit"),
  title: z.string().min(1).max(255),
  description: z.string().max(65535),
  dueDate: z.string().optional().default(""),
});
const commentSchema = z.object({ action: z.literal("comment"), content: z.string().trim().min(1).max(10000) });
const renameSchema = z.object({ action: z.literal("rename"), title: z.string().trim().min(1).max(255) });
const undoTitleSchema = z.object({ action: z.literal("undoTitle") });
const closeSchema = z.object({ action: z.literal("close") });
const reopenSchema = z.object({ action: z.literal("reopen") });
const watchSchema = z.object({ action: z.literal("watch") });
const bodySchema = z.discriminatedUnion("action", [editSchema, commentSchema, renameSchema, undoTitleSchema, closeSchema, reopenSchema, watchSchema]);

async function clientUser() {
  const user = await getSessionUser();
  return user && isClientRole(user.role) ? user : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await clientUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await params;
  const ticket = await findClientTicket(user, id);
  return ticket ? Response.json(ticket) : Response.json({ error: "Ticket not found." }, { status: 404 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await clientUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { id } = await params;
    const access = await getClientTicketAccess(user, id);
    if (!access || access.lifecycle !== "OPEN") return Response.json({ error: "Ticket not found." }, { status: 404 });
    const values = bodySchema.parse(await request.json());
    const own = access.createdBy === user.id;

    if (values.action === "edit") {
      if (!own || !["Open", "Reviewed"].includes(access.status)) {
        return Response.json({ error: "This ticket can no longer be edited by the client." }, { status: 403 });
      }
      await db.execute(
        "UPDATE tickets SET title = ?, description = ?, deadline = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [values.title, values.description, values.dueDate ? values.dueDate.slice(0, 10) : null, access.databaseId],
      );
      await addClientActivity(access.databaseId, user.id, "Edited ticket details", access.status);
    }

    if (values.action === "comment") {
      await db.execute(
        "INSERT INTO comments (ticket_id, user_id, content) VALUES (?, ?, ?)",
        [access.databaseId, user.id, values.content],
      );
      await addClientActivity(access.databaseId, user.id, "Added a comment", access.status);
    }

    if (values.action === "rename") {
      if (!own || !["Open", "Reviewed"].includes(access.status)) {
        return Response.json({ error: "This ticket can no longer be renamed by the client." }, { status: 403 });
      }
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
        await addClientActivity(access.databaseId, user.id, "Renamed ticket", access.status);
      }
    }

    if (values.action === "undoTitle") {
      if (!own || !["Open", "Reviewed"].includes(access.status)) {
        return Response.json({ error: "This ticket title cannot be restored by the client." }, { status: 403 });
      }
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
      await addClientActivity(access.databaseId, user.id, "Restored previous ticket title", access.status);
    }

    if (values.action === "close") {
      if (!own || ["Closed", "Cancelled"].includes(access.status)) return Response.json({ error: "You cannot close this ticket." }, { status: 403 });
      await db.execute("UPDATE tickets SET status = 'Closed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [access.databaseId]);
      await addClientActivity(access.databaseId, user.id, "Closed ticket", "Closed");
    }

    if (values.action === "reopen") {
      if (!own || !["Closed", "Resolved"].includes(access.status)) return Response.json({ error: "You cannot reopen this ticket." }, { status: 403 });
      await db.execute("UPDATE tickets SET status = 'Reopened', updated_at = CURRENT_TIMESTAMP WHERE id = ?", [access.databaseId]);
      await addClientActivity(access.databaseId, user.id, "Reopened ticket", "Reopened");
    }

    if (values.action === "watch") {
      const watchers = Array.isArray(access.formData.watchers)
        ? access.formData.watchers.map(Number).filter((value) => Number.isInteger(value) && value > 0)
        : [];
      const next = watchers.includes(user.id) ? watchers.filter((value) => value !== user.id) : [...watchers, user.id];
      await db.execute("UPDATE tickets SET form_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [JSON.stringify({ ...access.formData, watchers: next }), access.databaseId]);
      await addClientActivity(access.databaseId, user.id, watchers.includes(user.id) ? "Stopped watching ticket" : "Started watching ticket", access.status);
    }

    return Response.json(await findClientTicket(user, id));
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid ticket action." }, { status: 400 });
    console.error(error);
    return Response.json({ error: "Unable to update ticket." }, { status: 500 });
  }
}

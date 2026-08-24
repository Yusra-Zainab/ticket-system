import type { RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { getSessionUser, isResourceRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  addResourceActivity,
  getResourceTicketAccess,
  listResourceTickets,
  resourceHasProject,
} from "@/lib/resourcePortal";

const ticketTypes = [
  "Bug", "Task", "Change Request", "New Feature", "Feedback", "Support Request",
  "UI/UX Issue", "Content Update", "Technical Issue", "Testing / QA", "Maintenance",
  "Urgent Fix", "System Down",
] as const;

const schema = z.object({
  id: z.string().min(1).max(64).optional(),
  lifecycle: z.enum(["DRAFT", "OPEN"]),
  projectId: z.string().optional().default(""),
  title: z.string().max(255).optional().default(""),
  description: z.string().max(65535).optional().default(""),
  type: z.enum(ticketTypes).optional().default("Task"),
  dueDate: z.string().optional().default(""),
  urls: z.array(z.string().url()).max(20).optional().default([]),
  selfAssign: z.boolean().optional().default(false),
});

async function resourceUser() {
  const user = await getSessionUser();
  return user && isResourceRole(user.role) ? user : null;
}

async function projectSelfAssignAllowed(projectId: number) {
  const [rows] = await db.query<Array<RowDataPacket & { form_data: string | Record<string, unknown> | null }>>(
    "SELECT form_data FROM projects WHERE id = ? LIMIT 1",
    [projectId],
  );
  const raw = rows[0]?.form_data;
  let data: Record<string, unknown> = {};
  try { data = typeof raw === "string" ? JSON.parse(raw || "{}") : raw ?? {}; } catch { data = {}; }
  return data.allowResourceSelfAssign === true;
}

export async function GET(request: Request) {
  try {
    const user = await resourceUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
    const lifecycle = new URL(request.url).searchParams.get("state") === "draft" ? "DRAFT" : "OPEN";
    return Response.json(await listResourceTickets(user, lifecycle));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load tickets." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await resourceUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
    const values = schema.parse(await request.json());

    let projectId: number | null = null;
    if (values.projectId) {
      const parsed = Number(values.projectId);
      if (!(await resourceHasProject(user.id, parsed))) {
        return Response.json({ error: "You can only create tickets in projects assigned to you." }, { status: 403 });
      }
      projectId = parsed;
    }
    if (values.lifecycle === "OPEN" && !projectId) return Response.json({ error: "Select an assigned project." }, { status: 400 });
    if (values.lifecycle === "OPEN" && !values.title.trim()) return Response.json({ error: "Ticket title is required." }, { status: 400 });

    const ticketId = values.id || randomUUID();
    const existing = values.id ? await getResourceTicketAccess(user, values.id) : null;
    if (values.id && existing && existing.lifecycle !== "DRAFT") return Response.json({ error: "Submitted tickets must be edited from their details page." }, { status: 409 });
    if (values.id && !existing) {
      const [collision] = await db.query<Array<RowDataPacket & { id: number }>>("SELECT id FROM tickets WHERE ticket_id = ? LIMIT 1", [values.id]);
      if (collision[0]) return Response.json({ error: "That draft does not belong to you." }, { status: 403 });
    }

    const selfAssignAllowed = projectId ? await projectSelfAssignAllowed(projectId) : false;
    const assignedTo = values.selfAssign && selfAssignAllowed ? user.id : null;
    const storedData = { ...(existing?.formData ?? {}), type: values.type, urls: values.urls, portal: "resource" };
    const title = values.title.trim() || "Untitled ticket";
    const deadline = values.dueDate ? values.dueDate.slice(0, 10) : null;

    await db.execute(
      `
        INSERT INTO tickets (
          ticket_id, lifecycle, title, description, form_data, priority_type,
          priority_number, type, project_id, created_by, assigned_to, status,
          created_date, deadline
        )
        VALUES (?, ?, ?, ?, ?, 'Not Assigned', 0, ?, ?, ?, ?, 'Open', CURRENT_DATE, ?)
        ON DUPLICATE KEY UPDATE
          lifecycle = VALUES(lifecycle), title = VALUES(title), description = VALUES(description),
          form_data = VALUES(form_data), type = VALUES(type), project_id = VALUES(project_id),
          assigned_to = VALUES(assigned_to), deadline = VALUES(deadline), updated_at = CURRENT_TIMESTAMP
      `,
      [ticketId, values.lifecycle, title, values.description, JSON.stringify(storedData), values.type, projectId, user.id, assignedTo, deadline],
    );

    const access = await getResourceTicketAccess(user, ticketId);
    if (access) await addResourceActivity(access.databaseId, user.id, values.lifecycle === "DRAFT" ? "Saved ticket draft" : existing ? "Submitted ticket draft" : "Created ticket", values.lifecycle === "OPEN" ? "Open" : null);
    const saved = (await listResourceTickets(user, values.lifecycle)).find((ticket) => ticket.id === ticketId);
    return Response.json(saved ?? { id: ticketId }, { status: existing ? 200 : 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid ticket information.", details: error.flatten() }, { status: 400 });
    console.error(error);
    return Response.json({ error: "Unable to save ticket." }, { status: 500 });
  }
}

import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";

import { requireApiPermission } from "@/lib/apiPermissions";
import { db, getRolePermissionScope, listTickets } from "@/lib/db";
import { isAdminRole } from "@/lib/auth";

type ExistingTicketRow = RowDataPacket & {
  lifecycle: "DRAFT" | "OPEN";
  created_by: number | null;
};

const ticketSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().max(255).default(""),
  project: z.string(),
  status: z.string(),
  priority: z.number().int().min(1).max(4),
  assignedTo: z.string(),
  reporter: z.string(),
  created: z.string(),
  dueDate: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  formData: z.record(z.string(), z.unknown()).optional(),
});

const bodySchema = z.object({
  ticket: ticketSchema,
  state: z.enum(["draft", "open"]),
});

const priorityName = ["Not Assigned", "Critical", "High", "Medium", "Low"];

const TICKET_STATUSES = [
  "Open",
  "Assigned",
  "In Progress",
  "Blocked",
  "Ready for Review",
  "Closed",
] as const;

type IdRow = RowDataPacket & { id: number };

async function foreignId(
  table: "projects" | "users",
  column: "name",
  value: string,
) {
  if (!value || value === "Unassigned" || value === "Not selected") return null;
  const asId = Number(value);
  if (Number.isInteger(asId) && asId > 0) return asId;
  const [rows] = await db.query<IdRow[]>(
    `SELECT id FROM ${table} WHERE ${column}=? LIMIT 1`,
    [value],
  );
  return rows[0]?.id ?? null;
}

export async function GET(request: Request) {
  const auth = await requireApiPermission("View Tickets");
  if ("response" in auth) return auth.response;

  /*
   * This endpoint returns every ticket unscoped. That is fine for admins,
   * but a role whose "View Tickets" is ASSIGNED_ONLY must not use it to step
   * around the scoping that the resource portal applies via
   * `listResourceTickets` (F22). No first-party UI calls this route — the
   * admin and resource ticket pages both use their own server-side fetchers —
   * so a 403 here breaks nothing.
   */
  if (
    !isAdminRole(auth.user.role) &&
    (await getRolePermissionScope(auth.user.role, "View Tickets")) ===
      "ASSIGNED_ONLY"
  ) {
    return Response.json(
      { error: "Use the portal ticket list for scoped access." },
      { status: 403 },
    );
  }

  try {
    const state =
      new URL(request.url).searchParams.get("state") === "draft"
        ? "DRAFT"
        : "OPEN";
    return Response.json(await listTickets(state));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load tickets" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiPermission("Create Tickets");
  if ("response" in auth) return auth.response;

  try {
    const { ticket, state } = bodySchema.parse(await request.json());

    /*
     * This route creates NEW tickets and re-saves / registers the
     * caller's own DRAFT (client-supplied `ticket.id`). It must NOT
     * be a back door for editing an already-registered ticket — that
     * goes through PATCH /api/tickets/[id], which enforces per-field
     * permissions (Edit / Assign / Change Status / Change Priority)
     * and ASSIGNED_ONLY scope. Without this guard, "Create Tickets"
     * alone could overwrite any OPEN ticket by id (F7).
     */
    const [existingRows] = await db.query<ExistingTicketRow[]>(
      "SELECT lifecycle, created_by FROM tickets WHERE ticket_id = ? LIMIT 1",
      [ticket.id],
    );
    const existing = existingRows[0];

    if (existing) {
      if (existing.lifecycle === "OPEN") {
        return Response.json(
          {
            error:
              "This ticket already exists. Edit it from its detail page (PATCH /api/tickets/{id}).",
          },
          { status: 409 },
        );
      }
      if (
        existing.created_by != null &&
        existing.created_by !== auth.user.id
      ) {
        return Response.json(
          { error: "This draft belongs to another user." },
          { status: 403 },
        );
      }
    }

    const formData = ticket.formData ?? {};
    const projectId = await foreignId(
      "projects",
      "name",
      String(formData.projectId || ticket.project),
    );
    const assignedTo = await foreignId("users", "name", ticket.assignedTo);
    const createdBy = await foreignId("users", "name", ticket.reporter);
    const lifecycle = state === "draft" ? "DRAFT" : "OPEN";
    /*
     * Honour a valid requested status on an open create (F9); fall back
     * to "Open" for drafts or an unrecognised value.
     */
    const status = (TICKET_STATUSES as readonly string[]).includes(ticket.status)
      ? ticket.status
      : "Open";
    const createdDate = ticket.created ? ticket.created.slice(0, 10) : null;
    const deadline = ticket.dueDate ? ticket.dueDate.slice(0, 10) : null;
    const ticketType = String(ticket.formData?.type ?? "Task") || "Task";
    const selectedPriorityNumber = Math.min(
      999,
      Math.max(1, Number(formData.priorityNumber ?? ticket.priority) || 1),
    );
    const storedFormData = {
      id: ticket.id,
      ...formData,
      activity: Array.isArray(ticket.formData?.activity)
        ? ticket.formData.activity
        : [`Ticket loaded from database: ${ticket.id}`],
    };
    await db.execute(
      `INSERT INTO tickets (ticket_id,lifecycle,title,description,form_data,priority_type,priority_number,type,project_id,created_by,assigned_to,status,created_date,deadline) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE lifecycle=VALUES(lifecycle),title=VALUES(title),description=VALUES(description),form_data=VALUES(form_data),priority_type=VALUES(priority_type),priority_number=VALUES(priority_number),type=VALUES(type),project_id=VALUES(project_id),created_by=VALUES(created_by),assigned_to=VALUES(assigned_to),status=VALUES(status),deadline=VALUES(deadline)`,
      [
        ticket.id,
        lifecycle,
        ticket.title.trim() || "Untitled ticket",
        ticket.description,
        JSON.stringify(storedFormData),
        priorityName[ticket.priority] ?? "Not Assigned",
        selectedPriorityNumber,
        ticketType,
        projectId ?? null,
        createdBy ?? null,
        assignedTo ?? null,
        status,
        createdDate,
        deadline,
      ],
    );
    const stored = await listTickets(lifecycle);
    const saved = stored.find((entry) => entry.id === ticket.id) ?? {
      ...ticket,
      status,
    };
    return Response.json(saved, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return Response.json(
        { error: "Invalid ticket", details: error.flatten() },
        { status: 400 },
      );
    console.error(error);
    return Response.json({ error: "Unable to save ticket" }, { status: 500 });
  }
}

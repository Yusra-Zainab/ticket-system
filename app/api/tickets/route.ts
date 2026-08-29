import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";

import { requireApiPermission } from "@/lib/apiPermissions";
import { db, listTickets } from "@/lib/db";

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
    const formData = ticket.formData ?? {};
    const projectId = await foreignId(
      "projects",
      "name",
      String(formData.projectId || ticket.project),
    );
    const assignedTo = await foreignId("users", "name", ticket.assignedTo);
    const createdBy = await foreignId("users", "name", ticket.reporter);
    const lifecycle = state === "draft" ? "DRAFT" : "OPEN";
    const status = lifecycle === "OPEN" ? "Open" : ticket.status;
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

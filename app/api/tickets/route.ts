import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { db, listTickets } from "@/lib/db";

const ticketSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(255),
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
const priorityName = ["Critical", "Critical", "High", "Medium", "Low"];
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
  try {
    const { ticket, state } = bodySchema.parse(await request.json());
    const projectId = await foreignId("projects", "name", ticket.project);
    const assignedTo = await foreignId("users", "name", ticket.assignedTo);
    const createdBy = await foreignId("users", "name", ticket.reporter);
    const lifecycle = state === "draft" ? "DRAFT" : "OPEN";
    if (lifecycle === "OPEN" && !projectId) {
      return Response.json(
        { error: `Unknown project "${ticket.project}"` },
        { status: 400 },
      );
    }
    if (lifecycle === "OPEN" && !createdBy) {
      return Response.json(
        { error: `Unknown reporter "${ticket.reporter}"` },
        { status: 400 },
      );
    }
    if (lifecycle === "OPEN" && !assignedTo) {
      return Response.json(
        { error: `Unknown assignee "${ticket.assignedTo}"` },
        { status: 400 },
      );
    }
    const status = lifecycle === "OPEN" ? "Open" : ticket.status;
    const createdDate = ticket.created ? ticket.created.slice(0, 10) : null;
    const deadline = ticket.dueDate ? ticket.dueDate.slice(0, 10) : null;
    const ticketType = String(ticket.formData?.type ?? "Task") || "Task";
    await db.execute(
      `INSERT INTO tickets (ticket_id,lifecycle,title,description,form_data,priority_type,priority_number,type,project_id,created_by,assigned_to,status,created_date,deadline) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE lifecycle=VALUES(lifecycle),title=VALUES(title),description=VALUES(description),form_data=VALUES(form_data),priority_type=VALUES(priority_type),priority_number=VALUES(priority_number),type=VALUES(type),project_id=VALUES(project_id),created_by=VALUES(created_by),assigned_to=VALUES(assigned_to),status=VALUES(status),deadline=VALUES(deadline)`,
      [
        ticket.id,
        lifecycle,
        ticket.title,
        ticket.description,
        JSON.stringify({ id: ticket.id, ...ticket.formData }),
        priorityName[ticket.priority],
        ticket.priority,
        ticketType,
        lifecycle === "OPEN" ? projectId : projectId ?? null,
        lifecycle === "OPEN" ? createdBy : createdBy ?? null,
        lifecycle === "OPEN" ? assignedTo : assignedTo ?? null,
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

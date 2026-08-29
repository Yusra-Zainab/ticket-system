import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth";
import { requireApiPermission } from "@/lib/apiPermissions";
import { db, findTicket, getRolePermissionScope, getRolePermissions } from "@/lib/db";

const updateSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(65535).optional(),
    status: z
      .enum([
        "Open",
        "Assigned",
        "In Progress",
        "Blocked",
        "Ready for Review",
        "Closed",
      ])
      .optional(),
    priorityType: z
      .enum(["Not Assigned", "Low", "Medium", "High", "Critical"])
      .optional(),
    priorityNumber: z.number().int().min(1).max(999).optional(),
    deadline: z.string().date().nullable().optional(),
    assignedTo: z
      .union([z.number().int().positive(), z.string().min(1)])
      .nullable()
      .optional(),
    projectId: z
      .union([z.number().int().positive(), z.string().min(1)])
      .nullable()
      .optional(),
    formData: z.record(z.string(), z.unknown()).optional(),
    commentContent: z.string().trim().min(1).max(10000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

type IdRow = RowDataPacket & { id: number };

async function resolveForeignId(
  table: "projects" | "users",
  value: string | number | null | undefined,
) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isInteger(value) && value > 0 ? value : null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "Unassigned" || trimmed === "Not selected") return null;
  const asId = Number(trimmed);
  if (Number.isInteger(asId) && asId > 0) return asId;
  const [rows] = await db.query<IdRow[]>(`SELECT id FROM ${table} WHERE name=? LIMIT 1`, [trimmed]);
  return rows[0]?.id ?? null;
}

export async function GET(_request: Request, context: RouteContext<"/api/tickets/[id]">) {
  const auth = await requireApiPermission("View Tickets");
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const ticket = await findTicket(id);
    return ticket ? Response.json(ticket) : Response.json({ error: "Not found" }, { status: 404 });
  } catch {
    return Response.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/tickets/[id]">) {
  try {
    const { id } = await context.params;
    const body = updateSchema.parse(await request.json());
    const existing = await findTicket(id);
    const auth = await requireApiPermission("View Tickets");

    if ("response" in auth) return auth.response;

    const sessionUser = auth.user ?? (await getSessionUser().catch(() => null));
    const permissions = auth.permissions ?? (sessionUser ? await getRolePermissions(sessionUser.role) : []);

    if (!existing) {
      return Response.json({ error: "Ticket not found" }, { status: 404 });
    }

    const currentFormData = (existing.formData ?? {}) as Record<string, unknown>;
    const ownsTicket = existing.createdById != null && existing.createdById === sessionUser?.id;

    const needs = new Set<string>();
    if (
      body.title !== undefined ||
      body.description !== undefined ||
      body.projectId !== undefined ||
      body.formData !== undefined
    ) {
      needs.add("Edit Tickets");
    }
    if (body.assignedTo !== undefined) {
      needs.add("Assign Tickets");
    }
    if (body.status !== undefined) {
      needs.add("Change Ticket Status");
    }
    if (body.priorityType !== undefined || body.priorityNumber !== undefined) {
      needs.add("Change Ticket Priority");
    }
    if (body.commentContent !== undefined) {
      needs.add("View Tickets");
    }

    for (const permission of needs) {
      if (!permissions.includes(permission)) {
        return Response.json({ error: "Permission denied." }, { status: 403 });
      }
    }

    const scopeChecks = await Promise.all(
      [
        "Edit Tickets",
        "Assign Tickets",
        "Change Ticket Status",
        "Change Ticket Priority",
      ]
        .filter((permission) => needs.has(permission))
        .map(async (permission) => ({
          permission,
          scope: await getRolePermissionScope(auth.user.role, permission),
        })),
    );

    const [assignmentRows] = await db.query<RowDataPacket[]>(
      "SELECT created_by, assigned_to FROM tickets WHERE ticket_id = ? LIMIT 1",
      [id],
    );

    const assignment = assignmentRows[0] as
      | { created_by?: number | null; assigned_to?: number | null }
      | undefined;

    if (
      scopeChecks.some(({ scope }) => scope === "ASSIGNED_ONLY") &&
      !ownsTicket &&
      assignment?.assigned_to !== auth.user.id
    ) {
      return Response.json({ error: "Permission denied." }, { status: 403 });
    }

    if (body.title !== undefined && !ownsTicket) {
      return Response.json({ error: "Only the creator can rename this ticket." }, { status: 403 });
    }

    const currentHistory = Array.isArray(currentFormData.titleHistory)
      ? currentFormData.titleHistory.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
    const mergedFormData: Record<string, unknown> = {
      ...currentFormData,
      ...(body.formData ?? {}),
    };

    if (body.title !== undefined) {
      mergedFormData.title = body.title;
      if (body.title.trim() !== existing.title.trim()) {
        mergedFormData.titleHistory = [existing.title, ...currentHistory].slice(0, 20);
      } else if (!Array.isArray(mergedFormData.titleHistory)) {
        mergedFormData.titleHistory = currentHistory;
      }
    }

    if (body.description !== undefined) {
      mergedFormData.description = body.description;
    }

    const columns: Record<string, string> = {
      title: "title",
      description: "description",
      status: "status",
      priorityType: "priority_type",
      priorityNumber: "priority_number",
      deadline: "deadline",
      assignedTo: "assigned_to",
      projectId: "project_id",
      formData: "form_data",
    };

    const entries: Array<[keyof typeof columns, string | number | null]> = [];
    for (const [key, value] of Object.entries(body)) {
      if (key === "commentContent") continue;
      if (key === "formData") continue;
      if (key === "assignedTo" || key === "projectId") {
        const foreignValue =
          typeof value === "string" || typeof value === "number" || value == null
            ? value
            : null;
        const resolved = await resolveForeignId(key === "assignedTo" ? "users" : "projects", foreignValue);
        if (value != null && value !== "" && resolved == null) {
          throw new Error(`Unknown ${key === "assignedTo" ? "assignee" : "project"}.`);
        }
        entries.push([key, resolved]);
        continue;
      }
      entries.push([key, value as string | number | null]);
    }

    if (body.formData !== undefined || body.title !== undefined || body.description !== undefined) {
      entries.push(["formData", JSON.stringify(mergedFormData)]);
    }

    if (entries.length > 0) {
      const values = entries.map(([, value]) => value) as Array<string | number | null>;
      const sql = `UPDATE tickets SET ${entries.map(([key]) => `${columns[key]}=?`).join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE ticket_id=?`;
      await db.execute(sql, [...values, id] as Array<string | number | null>);
    }

    const [ticketRows] = await db.query<IdRow[]>("SELECT id FROM tickets WHERE ticket_id = ? LIMIT 1", [id]);
    const databaseTicketId = ticketRows[0]?.id ?? null;

    if (body.commentContent && databaseTicketId !== null) {
      await db.execute("INSERT INTO comments (ticket_id, user_id, content) VALUES (?, ?, ?)", [databaseTicketId, sessionUser?.id ?? null, body.commentContent]);
      await db.execute("INSERT INTO activities (ticket_id, user_id, action, status) VALUES (?, ?, ?, ?)", [databaseTicketId, sessionUser?.id ?? null, "Added a comment", existing.status ?? null]);
    }

    if (body.title !== undefined && body.title.trim() !== existing.title.trim() && databaseTicketId !== null) {
      await db.execute("INSERT INTO activities (ticket_id, user_id, action, status) VALUES (?, ?, ?, ?)", [databaseTicketId, sessionUser?.id ?? null, "Renamed ticket", existing.status ?? null]);
    }

    return Response.json(await findTicket(id));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Invalid ticket update", details: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error && error.message.startsWith("Unknown ")) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return Response.json({ error: "Unable to update ticket" }, { status: 500 });
  }
}

export const PUT = PATCH;

export async function DELETE(_request: Request, context: RouteContext<"/api/tickets/[id]">) {
  const auth = await requireApiPermission("Delete Tickets");
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const existing = await findTicket(id);
    if (!existing) {
      return Response.json({ error: "Ticket not found" }, { status: 404 });
    }

    const scope = await getRolePermissionScope(auth.user.role, "Delete Tickets");
    const [assignmentRows] = await db.query<RowDataPacket[]>(
      "SELECT created_by, assigned_to FROM tickets WHERE ticket_id = ? LIMIT 1",
      [id],
    );

    const assignment = assignmentRows[0] as
      | { created_by?: number | null; assigned_to?: number | null }
      | undefined;

    if (scope === "ASSIGNED_ONLY" && assignment?.created_by !== auth.user.id && assignment?.assigned_to !== auth.user.id) {
      return Response.json({ error: "Permission denied." }, { status: 403 });
    }

    const [result] = await db.execute(
      "DELETE FROM tickets WHERE ticket_id = ?",
      [id],
    );
    if (!("affectedRows" in result) || result.affectedRows === 0)
      return Response.json({ error: "Ticket not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to delete ticket" }, { status: 500 });
  }
}

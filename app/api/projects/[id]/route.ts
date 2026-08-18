import { z } from "zod";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { db, ensureProjectPriorityColumn, findProject, listProjects } from "@/lib/db";

const projectStatuses = [
  "Active",
  "Open",
  "In Progress",
  "Ready for Review",
  "Assigned",
  "Blocked",
  "Paused",
  "On Track",
  "Critical",
  "Completed",
] as const;

const projectPriorities = ["Critical", "High", "Medium", "Low", "Not Assigned"] as const;

const updateSchema = z.object({
  name: z.string().min(3).max(255).optional(),
  description: z.string().max(10000).optional(),
  clientId: z.coerce.number().int().positive().nullable().optional(),
  client: z.string().max(255).optional(),
  status: z.enum(projectStatuses).optional(),
  priority: z.enum(projectPriorities).optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  dueDate: z.string().nullable().optional(),
  team: z.array(z.string()).optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await ensureProjectPriorityColumn();
    const { id } = await context.params;
    const project = await findProject(id);

    return project
      ? Response.json(project)
      : Response.json({ error: "Project not found" }, { status: 404 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load project" }, { status: 503 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const connection = await db.getConnection();
  const { id } = await context.params;

  try {
    await ensureProjectPriorityColumn();
    const values = updateSchema.parse(await request.json());

    await connection.beginTransaction();

    const clientFieldProvided =
      values.client !== undefined || values.clientId !== undefined;
    let clientId = values.clientId;

    if (clientFieldProvided && !clientId && values.client) {
      const [clientRows] = await connection.query<(RowDataPacket & { id: number })[]>(
        `
          SELECT id
          FROM clients
          WHERE company = ?
             OR name = ?
          LIMIT 1
        `,
        [values.client, values.client],
      );

      clientId = clientRows[0]?.id ?? null;
    }

    const updates: string[] = [];
    const params: Array<string | number | null> = [];

    const push = (column: string, value: string | number | null | undefined) => {
      if (value === undefined) return;
      updates.push(`${column} = ?`);
      params.push(value);
    };

    push("name", values.name);
    push("description", values.description);
    if (clientFieldProvided) push("client_id", clientId ?? null);
    push("status", values.status);
    push("priority_type", values.priority);
    push("progress", values.progress);
    push("due_date", values.dueDate ?? null);

    if (!updates.length) {
      const existing = await findProject(id);
      return existing
        ? Response.json(existing)
        : Response.json({ error: "Project not found" }, { status: 404 });
    }

    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE projects SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`,
      [...params, Number(id)],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    await connection.commit();

    const project = (await listProjects()).find((item) => item.id === id);
    return Response.json(project ?? { id, ...values }, { status: 200 });
  } catch (error) {
    await connection.rollback();

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid project", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error(error);
    return Response.json({ error: "Unable to update project" }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const connection = await db.getConnection();
  const { id } = await context.params;

  try {
    await ensureProjectPriorityColumn();
    const [result] = await connection.execute<ResultSetHeader>(
      "DELETE FROM projects WHERE id = ?",
      [Number(id)],
    );

    if (result.affectedRows === 0) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to delete project" }, { status: 500 });
  } finally {
    connection.release();
  }
}

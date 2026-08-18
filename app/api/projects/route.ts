import { z } from "zod";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { db, ensureProjectPriorityColumn, listProjects } from "@/lib/db";

const schema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().max(10000).default(""),
  clientId: z.coerce.number().int().positive().nullable().optional(),
  client: z.string().max(255).optional(),
  status: z
    .enum([
      "Planning",
      "Not Started",
      "Active",
      "On Hold",
      "At Risk",
      "Delayed",
      "Completed",
      "Cancelled",
      "Archived",
    ])
    .default("Not Started"),
  priority: z
    .enum(["Critical", "High", "Medium", "Low", "Not Assigned"])
    .default("Not Assigned"),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  dueDate: z.string().nullable().optional(),
});

export async function GET() {
  try {
    await ensureProjectPriorityColumn();
    return Response.json(await listProjects());
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load projects" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureProjectPriorityColumn();
    const values = schema.parse(await request.json());

    let clientId = values.clientId ?? null;
    if (!clientId && values.client) {
      const [rows] = await db.query<(RowDataPacket & { id: number })[]>(
        "SELECT id FROM clients WHERE company = ? OR name = ? LIMIT 1",
        [values.client, values.client],
      );
      clientId = rows[0]?.id ?? null;
    }

    const [result] = await db.execute<ResultSetHeader>(
      `
        INSERT INTO projects (
          name,
          description,
          client_id,
          status,
          priority_type,
          progress,
          due_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        values.name,
        values.description,
        clientId,
        values.status,
        values.priority,
        values.progress,
        values.dueDate ?? null,
      ],
    );

    return Response.json(
      {
        id: String(result.insertId),
        ...values,
        clientId,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid project", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error(error);
    return Response.json(
      { error: "Unable to create project" },
      { status: 500 },
    );
  }
}

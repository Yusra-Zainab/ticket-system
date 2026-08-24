import { z } from "zod";
import type { PoolConnection, ResultSetHeader } from "mysql2/promise";

import { db, findProject, hasProjectPriorityColumn } from "@/lib/db";

const statusSchema = z.enum([
  "Planning",
  "Not Started",
  "Active",
  "On Hold",
  "At Risk",
  "Delayed",
  "Completed",
  "Cancelled",
  "Archived",
]);

const prioritySchema = z.enum([
  "Critical",
  "High",
  "Medium",
  "Low",
  "Not Assigned",
]);

const patchSchema = z.object({
  lifecycle: z.enum(["DRAFT", "OPEN"]).optional(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional(),
  clientId: z.coerce.number().int().positive().nullable().optional(),
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  projectType: z.string().max(255).optional(),
  clientOwnerId: z.string().nullable().optional(),
  coordinatorId: z.string().nullable().optional(),
  department: z.string().max(255).optional(),
  teamIds: z.array(z.string()).optional(),
  moduleName: z.string().max(255).optional(),
  subModule: z.string().max(255).optional(),
  moduleOwnerId: z.string().nullable().optional(),
  links: z
    .object({
      staging: z.string().default(""),
      live: z.string().default(""),
      figma: z.string().default(""),
      github: z.string().default(""),
    })
    .optional(),
  internalNotes: z.string().max(10000).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const project = await findProject(id);

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    return Response.json(project);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load project" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const projectId = Number(id);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return Response.json({ error: "Invalid project id" }, { status: 400 });
  }

  let connection: PoolConnection | undefined;
  let transactionStarted = false;

  try {
    connection = await db.getConnection();
    const values = patchSchema.parse(await request.json());
    const current = await findProject(id);

    if (!current) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const currentForm = current.formData ?? {};
    const formData = {
      ...currentForm,
      ...(values.priority !== undefined ? { priority: values.priority } : {}),
      ...(values.projectType !== undefined
        ? { projectType: values.projectType }
        : {}),
      ...(values.clientOwnerId !== undefined
        ? { clientOwnerId: values.clientOwnerId ?? "" }
        : {}),
      ...(values.coordinatorId !== undefined
        ? { coordinatorId: values.coordinatorId ?? "" }
        : {}),
      ...(values.department !== undefined
        ? { department: values.department }
        : {}),
      ...(values.teamIds !== undefined ? { teamIds: values.teamIds } : {}),
      ...(values.moduleName !== undefined
        ? { moduleName: values.moduleName }
        : {}),
      ...(values.subModule !== undefined
        ? { subModule: values.subModule }
        : {}),
      ...(values.moduleOwnerId !== undefined
        ? { moduleOwnerId: values.moduleOwnerId ?? "" }
        : {}),
      ...(values.links !== undefined ? { links: values.links } : {}),
      ...(values.internalNotes !== undefined
        ? { internalNotes: values.internalNotes }
        : {}),
    };

    await connection.beginTransaction();
    transactionStarted = true;

    const columns: string[] = [];
    const args: Array<string | number | null> = [];

    const add = (column: string, value: unknown) => {
      columns.push(`${column}=?`);
      args.push(value as string | number | null);
    };

    if (values.lifecycle !== undefined) add("lifecycle", values.lifecycle);
    if (values.name !== undefined) add("name", values.name);
    if (values.description !== undefined)
      add("description", values.description);
    if (values.clientId !== undefined) add("client_id", values.clientId);
    if (values.status !== undefined) add("status", values.status);
    if (values.priority !== undefined && (await hasProjectPriorityColumn())) {
      add("priority_type", values.priority);
    }
    if (values.progress !== undefined) add("progress", values.progress);
    if (values.startDate !== undefined)
      add("start_date", values.startDate || null);
    if (values.dueDate !== undefined) add("due_date", values.dueDate || null);

    const touchesFormData = [
      "projectType",
      "clientOwnerId",
      "coordinatorId",
      "department",
      "teamIds",
      "moduleName",
      "subModule",
      "moduleOwnerId",
      "links",
      "priority",
      "internalNotes",
    ].some((key) => key in values);

    if (touchesFormData) add("form_data", JSON.stringify(formData));

    if (columns.length) {
      args.push(projectId);

      const [result] = await connection.execute<ResultSetHeader>(
        `UPDATE projects SET ${columns.join(",")},updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        args,
      );

      if (!result.affectedRows) {
        await connection.rollback();
        return Response.json({ error: "Project not found" }, { status: 404 });
      }
    }

    await connection.commit();

    const updated = await findProject(id);
    return Response.json(updated);
  } catch (error) {
    if (transactionStarted && connection) {
      await connection.rollback();
    }

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid project update", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error(error);
    return Response.json(
      { error: "Unable to update project" },
      { status: 500 },
    );
  } finally {
    connection?.release();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const projectId = Number(id);

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return Response.json({ error: "Invalid project id" }, { status: 400 });
  }

  try {
    const [result] = await db.execute<ResultSetHeader>(
      "DELETE FROM projects WHERE id=?",
      [projectId],
    );

    if (!result.affectedRows) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Unable to delete project" },
      { status: 500 },
    );
  }
}

import { z } from "zod";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { db, hasProjectPriorityColumn, listProjects } from "@/lib/db";

const projectStatus = z.enum([
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

const projectPriority = z.enum([
  "Critical",
  "High",
  "Medium",
  "Low",
  "Not Assigned",
]);

const projectSchema = z.object({
  name: z.string().max(255).default(""),
  description: z.string().max(10000).default(""),
  clientId: z.coerce.number().int().positive().nullable().optional(),
  client: z.string().max(255).optional(),
  projectType: z.string().max(255).default(""),
  status: projectStatus.default("Not Started"),
  priority: projectPriority.default("Not Assigned"),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  clientOwnerId: z.string().nullable().optional(),
  coordinatorId: z.string().nullable().optional(),
  department: z.string().max(255).default(""),
  teamIds: z.array(z.string()).default([]),
  moduleName: z.string().max(255).default(""),
  subModule: z.string().max(255).default(""),
  moduleOwnerId: z.string().nullable().optional(),
  links: z
    .object({
      staging: z.string().default(""),
      live: z.string().default(""),
      figma: z.string().default(""),
      github: z.string().default(""),
    })
    .default({ staging: "", live: "", figma: "", github: "" }),
  internalNotes: z.string().max(10000).default(""),
});

const bodySchema = z.object({
  project: projectSchema,
  state: z.enum(["draft", "open"]),
});

type IdRow = RowDataPacket & { id: number };

async function resolveClientId(
  clientId: number | null | undefined,
  clientName?: string,
) {
  if (clientId) return clientId;
  if (!clientName) return null;

  const [rows] = await db.query<IdRow[]>(
    "SELECT id FROM clients WHERE company=? OR name=? LIMIT 1",
    [clientName, clientName],
  );

  return rows[0]?.id ?? null;
}

export async function GET(request: Request) {
  try {
    const state = new URL(request.url).searchParams.get("state");
    const lifecycle = state === "draft" ? "DRAFT" : "OPEN";
    return Response.json(await listProjects(lifecycle));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load projects" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const connection = await db.getConnection();

  try {
    const { project, state } = bodySchema.parse(await request.json());
    const lifecycle = state === "draft" ? "DRAFT" : "OPEN";

    if (lifecycle === "OPEN") {
      if (project.name.trim().length < 3) {
        return Response.json(
          { error: "Project name must be at least 3 characters." },
          { status: 400 },
        );
      }
      if (!project.clientId && !project.client) {
        return Response.json(
          { error: "A client is required before registering the project." },
          { status: 400 },
        );
      }
    }

    const clientId = await resolveClientId(project.clientId, project.client);

    const safeName =
      project.name.trim() ||
      `Untitled project ${new Date().toISOString().slice(0, 10)}`;

    const formData = {
      projectType: project.projectType,
      clientOwnerId: project.clientOwnerId ?? "",
      coordinatorId: project.coordinatorId ?? "",
      department: project.department,
      teamIds: project.teamIds,
      moduleName: project.moduleName,
      subModule: project.subModule,
      moduleOwnerId: project.moduleOwnerId ?? "",
      links: project.links,
      internalNotes: project.internalNotes,
      priority: project.priority,
    };

    await connection.beginTransaction();

    const hasPriorityColumn = await hasProjectPriorityColumn();
    const columns = [
      "lifecycle",
      "name",
      "description",
      "client_id",
      "status",
      ...(hasPriorityColumn ? ["priority_type"] : []),
      "progress",
      "start_date",
      "due_date",
      "form_data",
    ];

    const values = [
      lifecycle,
      safeName,
      project.description,
      clientId,
      project.status,
      ...(hasPriorityColumn ? [project.priority] : []),
      project.progress,
      project.startDate || null,
      project.dueDate || null,
      JSON.stringify(formData),
    ];

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO projects (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
      values,
    );

    const projectId = result.insertId;

    await connection.commit();

    return Response.json(
      {
        id: String(projectId),
        lifecycle,
        ...project,
        name: safeName,
        clientId,
      },
      { status: 201 },
    );
  } catch (error) {
    await connection.rollback();

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid project", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error(error);
    return Response.json({ error: "Unable to save project" }, { status: 500 });
  } finally {
    connection.release();
  }
}

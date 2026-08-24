import { randomBytes, randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { z } from "zod";

import { hashPassword } from "@/lib/auth";
import { db, findResource, listResourceRows } from "@/lib/db";

const schema = z.object({
  id: z.string().min(1).max(64).optional(),
  lifecycle: z.enum(["OPEN", "DRAFT"]).default("DRAFT"),
  name: z.string().min(1).max(255),
  email: z.string().trim().max(255),
  role: z.string().min(1).max(100),
  avatar: z.string().nullable().optional(),
  formData: z.record(z.string(), z.unknown()).default({}),
});

type ExistingUserRow = RowDataPacket & {
  id: number;
};

async function syncProjectAssignments(userId: number, projectId?: string) {
  await db.execute("DELETE FROM project_resources WHERE user_id = ?", [userId]);

  const numericProjectId = Number(projectId);

  if (Number.isInteger(numericProjectId) && numericProjectId > 0) {
    await db.execute(
      `
        INSERT INTO project_resources (
          project_id,
          user_id
        )
        VALUES (?, ?)
      `,
      [numericProjectId, userId],
    );
  }
}

export async function GET(request: Request) {
  try {
    const state = new URL(request.url).searchParams.get("state");
    const lifecycle = state === "draft" ? "DRAFT" : "OPEN";
    return Response.json(await listResourceRows(lifecycle));
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load resources." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const value = schema.parse(await request.json());
    const current = value.id ? await findResource(value.id) : undefined;
    const normalizedRole = value.role.trim().toLowerCase().replaceAll(" ", "_");
    const rawEmail = value.email.trim().toLowerCase();
    const email =
      rawEmail ||
      current?.email ||
      `draft-${randomUUID()}@draft.local`;
    const storedFormData = JSON.stringify(value.formData);

    if (
      value.lifecycle === "OPEN" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)
    ) {
      return Response.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const [existingUsers] = await db.query<ExistingUserRow[]>(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER(?)
          AND (? IS NULL OR id <> ?)
        LIMIT 1
      `,
      [email, current ? Number(current.id) : null, current ? Number(current.id) : null],
    );

    if (existingUsers[0]) {
      return Response.json(
        { error: "A user with this email already exists." },
        { status: 409 },
      );
    }

    let userId = current ? Number(current.id) : 0;

    if (current) {
      await db.execute(
        `
          UPDATE users
          SET
            name = ?,
            email = ?,
            role = ?,
            avatar = ?,
            lifecycle = ?,
            form_data = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [
          value.name,
          email,
          normalizedRole,
          value.avatar ?? null,
          value.lifecycle,
          storedFormData,
          userId,
        ],
      );
    } else {
      const password = await hashPassword(randomBytes(18).toString("base64url"));
      const [result] = await db.execute<ResultSetHeader>(
        `
          INSERT INTO users (
            name,
            email,
            password,
            role,
            avatar,
            lifecycle,
            form_data
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          value.name,
          email,
          password,
          normalizedRole,
          value.avatar ?? null,
          value.lifecycle,
          storedFormData,
        ],
      );

      userId = result.insertId;
    }

    await syncProjectAssignments(
      userId,
      typeof value.formData.projectId === "string" ? value.formData.projectId : undefined,
    );

    return Response.json(
      {
        id: String(userId),
        lifecycle: value.lifecycle,
      },
      { status: current ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid resource data.", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error(error);
    return Response.json({ error: "Unable to save resource." }, { status: 500 });
  }
}

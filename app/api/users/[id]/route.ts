import { z } from "zod";

import { hashPassword } from "@/lib/auth";
import { db, findAdminUser } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  role: z.string().min(2).max(100),
  avatar: z.string().nullable().optional(),
  lifecycle: z.enum(["OPEN", "DRAFT"]).default("OPEN"),
  formData: z.record(z.string(), z.unknown()).default({}),
  password: z.string().min(8).max(200).optional(),
});

function normalizeRole(role: string) {
  return role.trim().toLowerCase().replaceAll(" ", "_");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await findAdminUser(id);

    if (!user) {
      return Response.json({ error: "User not found." }, { status: 404 });
    }

    return Response.json(user);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load user." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const value = schema.parse(await request.json());
    const formData = {
      ...value.formData,
      email: value.email,
      workEmail: value.email,
    };

    if (value.password) {
      await db.execute(
        `
          UPDATE users
          SET
            name = ?,
            email = ?,
            password = ?,
            role = ?,
            avatar = ?,
            lifecycle = ?,
            form_data = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [
          value.name,
          value.email,
          await hashPassword(value.password),
          normalizeRole(value.role),
          value.avatar ?? null,
          value.lifecycle,
          JSON.stringify(formData),
          id,
        ],
      );
    } else {
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
          value.email,
          normalizeRole(value.role),
          value.avatar ?? null,
          value.lifecycle,
          JSON.stringify(formData),
          id,
        ],
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid user information.", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error(error);
    return Response.json({ error: "Unable to update user." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await db.execute("DELETE FROM users WHERE id = ? LIMIT 1", [id]);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to delete user." }, { status: 500 });
  }
}

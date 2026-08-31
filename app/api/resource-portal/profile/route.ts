import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";

import { getSessionUser, hashPassword, isResourceRole } from "@/lib/auth";
import { AvatarError, persistUserAvatar } from "@/lib/avatars";
import { db } from "@/lib/db";
import { passwordSchema } from "@/lib/passwordPolicy";
import { avatarSchema } from "@/lib/validation";
import { getResourceProfile } from "@/lib/resourcePortal";

const schema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(80).optional().default(""),
  jobTitle: z.string().trim().max(120).optional().default(""),
  avatar: avatarSchema.optional().default(""),
  emailNotifications: z.boolean().optional().default(true),
  newPassword: passwordSchema.optional(),
});

async function resourceUser() {
  const user = await getSessionUser();
  return user && isResourceRole(user.role) ? user : null;
}

export async function GET() {
  const user = await resourceUser();

  if (!user) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  return Response.json(await getResourceProfile(user));
}

export async function PATCH(request: Request) {
  try {
    const user = await resourceUser();

    if (!user) {
      return Response.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const values = schema.parse(await request.json());

    const avatarUrl = await persistUserAvatar(user.id, values.avatar);

    const [rows] = await db.query<
      Array<
        RowDataPacket & {
          form_data: string | Record<string, unknown> | null;
        }
      >
    >("SELECT form_data FROM users WHERE id = ? LIMIT 1", [user.id]);

    const raw = rows[0]?.form_data;
    let current: Record<string, unknown> = {};

    try {
      current = typeof raw === "string" ? JSON.parse(raw || "{}") : raw ?? {};
    } catch {
      current = {};
    }

    const next: Record<string, unknown> = {
      ...current,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      jobTitle: values.jobTitle,
      avatarUrl: avatarUrl ?? "",
      emailNotifications: values.emailNotifications,
    };
    if (values.newPassword) {
      delete next.mustChangePassword; // real password chosen (F14)
    }

    const name = [values.firstName, values.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    /*
     * `users.avatar` holds the serving-endpoint URL (or null). The resource
     * tables / detail views / ticket-comment + project-team avatars all read
     * the column (F18); the bytes live in `user_avatars` (F26).
     */
    const avatarColumn = avatarUrl;

    if (values.newPassword) {
      await db.execute(
        `
          UPDATE users
          SET
            name = ?,
            avatar = ?,
            form_data = ?,
            password = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [
          name,
          avatarColumn,
          JSON.stringify(next),
          await hashPassword(values.newPassword),
          user.id,
        ],
      );
    } else {
      await db.execute(
        `
          UPDATE users
          SET
            name = ?,
            avatar = ?,
            form_data = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [name, avatarColumn, JSON.stringify(next), user.id],
      );
    }

    return Response.json(await getResourceProfile({ ...user, name }));
  } catch (error) {
    if (error instanceof AvatarError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0]?.message;
      return Response.json(
        {
          error: firstIssue || "Invalid profile information.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    console.error(error);
    return Response.json(
      { error: "Unable to update profile." },
      { status: 500 },
    );
  }
}
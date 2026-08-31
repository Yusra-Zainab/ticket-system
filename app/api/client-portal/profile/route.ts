import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";

import { getSessionUser, hashPassword, isClientRole } from "@/lib/auth";
import { AvatarError, persistUserAvatar } from "@/lib/avatars";
import { db } from "@/lib/db";
import { getClientProfile } from "@/lib/clientPortal";
import { passwordSchema } from "@/lib/passwordPolicy";
import { avatarSchema } from "@/lib/validation";

const schema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(80).optional().default(""),
  jobTitle: z.string().trim().max(120).optional().default(""),
  avatar: avatarSchema.optional().default(""),
  emailNotifications: z.boolean().optional().default(true),
  newPassword: passwordSchema.optional(),
});

async function clientUser() {
  const user = await getSessionUser();
  return user && isClientRole(user.role) ? user : null;
}

export async function GET() {
  const user = await clientUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  return Response.json(await getClientProfile(user));
}

export async function PATCH(request: Request) {
  try {
    const user = await clientUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
    const values = schema.parse(await request.json());
    const avatarUrl = await persistUserAvatar(user.id, values.avatar);
    const [rows] = await db.query<Array<RowDataPacket & { form_data: string | Record<string, unknown> | null }>>(
      "SELECT form_data FROM users WHERE id = ? LIMIT 1",
      [user.id],
    );
    const current = typeof rows[0]?.form_data === "string" ? JSON.parse(rows[0].form_data || "{}") : rows[0]?.form_data ?? {};
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
    const name = [values.firstName, values.lastName].filter(Boolean).join(" ").trim();
    // `users.avatar` holds the serving URL (bytes live in user_avatars — F26).
    const avatarColumn = avatarUrl;

    if (values.newPassword) {
      await db.execute(
        "UPDATE users SET name = ?, avatar = ?, form_data = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [name, avatarColumn, JSON.stringify(next), await hashPassword(values.newPassword), user.id],
      );
    } else {
      await db.execute(
        "UPDATE users SET name = ?, avatar = ?, form_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [name, avatarColumn, JSON.stringify(next), user.id],
      );
    }

    return Response.json(await getClientProfile({ ...user, name }));
  } catch (error) {
    if (error instanceof AvatarError) return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid profile information.", details: error.flatten() }, { status: 400 });
    console.error(error);
    return Response.json({ error: "Unable to update profile." }, { status: 500 });
  }
}

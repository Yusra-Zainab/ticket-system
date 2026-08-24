import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";

import { getSessionUser, hashPassword, isResourceRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getResourceProfile } from "@/lib/resourcePortal";

const schema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).optional().default(""),
  phone: z.string().trim().max(80).optional().default(""),
  jobTitle: z.string().trim().max(120).optional().default(""),
  avatar: z.string().trim().max(2000).optional().default(""),
  emailNotifications: z.boolean().optional().default(true),
  newPassword: z.string().min(8).max(200).optional(),
});

async function resourceUser() {
  const user = await getSessionUser();
  return user && isResourceRole(user.role) ? user : null;
}

export async function GET() {
  const user = await resourceUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  return Response.json(await getResourceProfile(user));
}

export async function PATCH(request: Request) {
  try {
    const user = await resourceUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
    const values = schema.parse(await request.json());
    const [rows] = await db.query<Array<RowDataPacket & { form_data: string | Record<string, unknown> | null }>>("SELECT form_data FROM users WHERE id = ? LIMIT 1", [user.id]);
    const raw = rows[0]?.form_data;
    let current: Record<string, unknown> = {};
    try { current = typeof raw === "string" ? JSON.parse(raw || "{}") : raw ?? {}; } catch { current = {}; }
    const next = { ...current, firstName: values.firstName, lastName: values.lastName, phone: values.phone, jobTitle: values.jobTitle, avatarUrl: values.avatar, emailNotifications: values.emailNotifications };
    const name = [values.firstName, values.lastName].filter(Boolean).join(" ").trim();

    if (values.newPassword) {
      await db.execute("UPDATE users SET name = ?, form_data = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [name, JSON.stringify(next), await hashPassword(values.newPassword), user.id]);
    } else {
      await db.execute("UPDATE users SET name = ?, form_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [name, JSON.stringify(next), user.id]);
    }
    return Response.json(await getResourceProfile({ ...user, name }));
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid profile information.", details: error.flatten() }, { status: 400 });
    console.error(error);
    return Response.json({ error: "Unable to update profile." }, { status: 500 });
  }
}

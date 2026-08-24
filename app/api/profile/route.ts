import { z } from "zod";

import { hashPassword, requireAdminPageSession } from "@/lib/auth";
import { countActiveSessionsForUser, db, findAdminUser } from "@/lib/db";

const schema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().max(120),
  email: z.string().email(),
  phone: z.string().max(120).optional().default(""),
  jobTitle: z.string().max(120).optional().default(""),
  timeZone: z.string().max(120).optional().default(""),
  twoFactorEnabled: z.boolean().optional().default(true),
  newPassword: z.string().min(8).max(200).optional(),
});

export async function GET() {
  try {
    const sessionUser = await requireAdminPageSession();
    const profile = await findAdminUser(String(sessionUser.id));

    if (!profile) {
      return Response.json({ error: "Profile not found." }, { status: 404 });
    }

    const activeSessions = await countActiveSessionsForUser(sessionUser.id);

    return Response.json({
      profile,
      activeSessions,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load profile." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await requireAdminPageSession();
    const values = schema.parse(await request.json());
    const current = await findAdminUser(String(sessionUser.id));

    if (!current) {
      return Response.json({ error: "Profile not found." }, { status: 404 });
    }

    const fullName = [values.firstName, values.lastName].filter(Boolean).join(" ").trim();
    const nextFormData = {
      ...current.formData,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      workEmail: values.email,
      phone: values.phone,
      jobTitle: values.jobTitle,
      timeZone: values.timeZone,
      twoFactorEnabled: values.twoFactorEnabled,
    };

    await db.execute(
      `
        UPDATE users
        SET
          name = ?,
          email = ?,
          role = ?,
          form_data = ?,
          ${values.newPassword ? "password = ?," : ""}
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      values.newPassword
        ? [
            fullName || current.name,
            values.email,
            (values.jobTitle || current.role).trim().toLowerCase().replaceAll(" ", "_"),
            JSON.stringify(nextFormData),
            await hashPassword(values.newPassword),
            sessionUser.id,
          ]
        : [
            fullName || current.name,
            values.email,
            (values.jobTitle || current.role).trim().toLowerCase().replaceAll(" ", "_"),
            JSON.stringify(nextFormData),
            sessionUser.id,
          ],
    );

    const profile = await findAdminUser(String(sessionUser.id));
    const activeSessions = await countActiveSessionsForUser(sessionUser.id);

    return Response.json({
      profile,
      activeSessions,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid profile information.", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error(error);
    return Response.json({ error: "Unable to update profile." }, { status: 500 });
  }
}

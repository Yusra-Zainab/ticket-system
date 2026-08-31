import { z } from "zod";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { hashPassword, sendMail } from "@/lib/auth";
import { requireApiPermission } from "@/lib/apiPermissions";
import { AvatarError, persistUserAvatar } from "@/lib/avatars";
import { db, listUsers } from "@/lib/db";
import { generateTempPassword } from "@/lib/passwordPolicy";
import { avatarSchema } from "@/lib/validation";
import { normalizeUserRole } from "@/lib/userRoles";

const schema = z.object({
  name: z.string().min(2).max(255),
  email: z.email(),
  role: z.string().min(2).max(100),
  avatar: avatarSchema.nullable().optional(),
  lifecycle: z.enum(["OPEN", "DRAFT"]).default("OPEN"),
  formData: z.record(z.string(), z.unknown()).default({}),
  password: z.string().min(8).max(200).optional(),
});

/*
 * IMPORTANT: this must be the SAME normalizer /api/resources uses
 * (lib/userRoles.ts -> normalizeUserRole). Two different slugifiers
 * writing to the same users.role column is how that column ends up
 * with mismatched formats depending on which endpoint touched the
 * row, which breaks any downstream lookup (e.g. matching a role
 * name in the roles table to compute resource-portal permissions).
 */
function persistedRoleFromInput(role: string) {
  return normalizeUserRole(role);
}

type ExistingUserRow = RowDataPacket & {
  id: number;
};

export async function GET() {
  const auth = await requireApiPermission("View Users");

  if ("response" in auth) {
    return auth.response;
  }

  try {
    return Response.json(await listUsers());
  } catch {
    return Response.json(
      {
        error: "Unable to load users",
      },
      {
        status: 503,
      },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireApiPermission("Create Users");

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const value = schema.parse(await request.json());
    const persistedRole = (() => {
      const explicitRole = persistedRoleFromInput(value.role || "");
      if (explicitRole && explicitRole !== "resource") {
        return explicitRole;
      }

      const fallbackRole = persistedRoleFromInput(
        String(value.formData.jobTitle ?? ""),
      );
      return fallbackRole || explicitRole;
    })();
    const workEmail =
      typeof value.formData.workEmail === "string" &&
      value.formData.workEmail.trim()
        ? value.formData.workEmail.trim()
        : value.email.trim();
    const generatedPassword = value.password ? null : generateTempPassword();
    const password = value.password ?? generatedPassword!;
    const formData = {
      ...value.formData,
      email: workEmail,
      workEmail,
      jobTitle: String(value.formData.jobTitle ?? ""),
      role: persistedRole,
      // Force a change on first login when we set the password (F14).
      ...(generatedPassword ? { mustChangePassword: true } : {}),
    };
    const [existingUsers] = await db.query<ExistingUserRow[]>(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
      `,
      [workEmail],
    );

    if (existingUsers[0]) {
      return Response.json(
        {
          error: "A user with this work email already exists.",
        },
        {
          status: 409,
        },
      );
    }

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

          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
      [
        value.name,
        workEmail,
        await hashPassword(password),
        persistedRole,
        null,
        value.lifecycle,
        JSON.stringify(formData),
      ],
    );

    // Store the photo now that the row exists (F26).
    const avatarUrl = await persistUserAvatar(result.insertId, value.avatar);
    if (avatarUrl) {
      await db.execute("UPDATE users SET avatar = ? WHERE id = ?", [
        avatarUrl,
        result.insertId,
      ]);
    }

    if (persistedRole === "superadmin") {
      await db.execute(
        `
          UPDATE users
          SET role = 'superadmin', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [result.insertId],
      );
    }

    /*
     * Email the temporary credentials when we generated the password, so
     * the account is usable and the recipient knows to change it (F14).
     * If the admin set an explicit password they already know it.
     */
    if (generatedPassword) {
      try {
        await sendMail({
          to: workEmail,
          subject: "Your account has been created",
          html: `
            <p>Your account has been created.</p>
            <p><strong>Work Email:</strong> ${workEmail}</p>
            <p><strong>Temporary Password:</strong> ${generatedPassword}</p>
            <p>You will be asked to choose a new password when you first sign in.</p>
          `,
        });
      } catch (mailError) {
        console.error(mailError);

        return Response.json(
          {
            id: String(result.insertId),
            name: value.name,
            email: workEmail,
            role: persistedRole,
            avatar: avatarUrl,
            warning:
              "User created, but the onboarding email could not be sent to the work email.",
          },
          {
            status: 201,
          },
        );
      }
    }

    return Response.json(
      {
        id: String(result.insertId),
        name: value.name,
        email: workEmail,
        role: persistedRole,
        avatar: avatarUrl,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof AvatarError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Invalid user",
          details: error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    console.error(error);

    return Response.json(
      {
        error: "Unable to create user",
      },
      {
        status: 500,
      },
    );
  }
}

import { randomBytes } from "node:crypto";

import { z } from "zod";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { hashPassword, sendMail } from "@/lib/auth";
import { requireApiPermission } from "@/lib/apiPermissions";
import { db, listUsers } from "@/lib/db";
import { isAdminRole, normalizeUserRole } from "@/lib/userRoles";

const DEFAULT_ADMIN_PASSWORD = "Password123!";

const schema = z.object({
  name: z.string().min(2).max(255),
  email: z.email(),
  role: z.string().min(2).max(100),
  avatar: z.string().nullable().optional(),
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
    const password =
      value.password ??
      (isAdminRole(value.role)
        ? DEFAULT_ADMIN_PASSWORD
        : randomBytes(18).toString("base64url"));
    const formData = {
      ...value.formData,
      email: workEmail,
      workEmail,
      jobTitle: String(value.formData.jobTitle ?? ""),
      role: persistedRole,
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
        value.avatar ?? null,
        value.lifecycle,
        JSON.stringify(formData),
      ],
    );

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

    if (isAdminRole(value.role)) {
      try {
        await sendMail({
          to: workEmail,
          subject: "Your admin account has been created",
          html: `
            <p>Your admin account has been created.</p>
            <p><strong>Work Email:</strong> ${workEmail}</p>
            <p><strong>Password:</strong> ${DEFAULT_ADMIN_PASSWORD}</p>
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
            avatar: value.avatar ?? null,
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
        avatar: value.avatar ?? null,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
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

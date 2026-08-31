import {
  randomBytes,
} from "node:crypto";

import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

import {
  z,
} from "zod";

import {
  hashPassword,
  sendMail,
} from "@/lib/auth";

import { requireApiPermission } from "@/lib/apiPermissions";

import { AvatarError, persistUserAvatar } from "@/lib/avatars";

import {
  db,
  findResource,
  listResourceRows,
} from "@/lib/db";

import { generateTempPassword } from "@/lib/passwordPolicy";

import { avatarSchema } from "@/lib/validation";

import {
  isResourceRole,
  normalizeUserRole,
  portalForRole,
  portalHomeForRole,
} from "@/lib/userRoles";

const schema =
  z.object({
    id:
      z
        .string()
        .min(1)
        .max(64)
        .optional(),

    lifecycle:
      z
        .enum([
          "OPEN",
          "DRAFT",
        ])
        .default(
          "DRAFT",
        ),

    name:
      z
        .string()
        .min(1)
        .max(255),

    email:
      z
        .string()
        .email(),

    role:
      z
        .string()
        .min(1)
        .max(100),

    avatar: avatarSchema.nullable().optional(),

    formData:
      z
        .record(
          z.string(),
          z.unknown(),
        )
        .default({}),
  });

type ExistingEmailRow =
  RowDataPacket & {
    id: number;
  };

async function syncProjectAssignments(
  userId: number,
  projectId?: string,
) {
  await db.execute(
    `
      DELETE FROM
        project_resources

      WHERE
        user_id = ?
    `,
    [
      userId,
    ],
  );

  const numericProjectId =
    Number(
      projectId,
    );

  if (
    Number.isInteger(
      numericProjectId,
    ) &&
    numericProjectId >
      0
  ) {
    await db.execute(
      `
        INSERT INTO
          project_resources (
            project_id,
            user_id
          )

        VALUES (?, ?)
      `,
      [
        numericProjectId,
        userId,
      ],
    );
  }
}

export async function GET(
  request: Request,
) {
  const auth = await requireApiPermission("View Resources");

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const state =
      new URL(
        request.url,
      ).searchParams.get(
        "state",
      );

    const lifecycle =
      state === "draft"
        ? "DRAFT"
        : "OPEN";

    return Response.json(
      await listResourceRows(
        lifecycle,
      ),
    );
  } catch (
    error
  ) {
    console.error(
      error,
    );

    return Response.json(
      {
        error:
          "Unable to load resources.",
      },
      {
        status: 503,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const value =
      schema.parse(
        await request.json(),
      );

    const auth = await requireApiPermission(
      value.id ? "Edit Resources" : "Create Resources",
    );

    if ("response" in auth) {
      return auth.response;
    }

    if (String(value.formData.projectId ?? "").trim()) {
      const assignAuth = await requireApiPermission("Assign Resources");

      if ("response" in assignAuth) {
        return assignAuth.response;
      }
    }

    const storedRole = (() => {
      const explicitRole = String(value.role ?? "").trim();
      if (explicitRole && explicitRole !== "resource") {
        return explicitRole;
      }

      return String(value.formData.jobTitle ?? "").trim();
    })();

    const normalizedRole =
      normalizeUserRole(
        storedRole,
      );

    /*
     * Resource endpoint may create
     * every role EXCEPT:
     *
     * Admin
     * Super Admin
     * Client
     * Client Team
     */
    if (
      !isResourceRole(
        normalizedRole,
      )
    ) {
      return Response.json(
        {
          error:
            "Admin, Super Admin, Client and Client Team roles cannot be saved as resources.",
        },
        {
          status: 400,
        },
      );
    }

    const current =
      value.id
        ? await findResource(
            value.id,
          )
        : undefined;

    /*
     * If an ID was supplied but
     * findResource refuses it, it
     * either doesn't exist or is not
     * actually a Resource.
     */
    if (
      value.id &&
      !current
    ) {
      return Response.json(
        {
          error:
            "Resource not found.",
        },
        {
          status: 404,
        },
      );
    }

    const email =
      value.email
        .trim()
        .toLowerCase();

    const [existing] =
      await db.query<
        ExistingEmailRow[]
      >(
        `
          SELECT
            id

          FROM users

          WHERE
            LOWER(email) =
            LOWER(?)

            ${
              current
                ? "AND id <> ?"
                : ""
            }

          LIMIT 1
        `,
        current
          ? [
              email,
              Number(
                current.id,
              ),
            ]
          : [
              email,
            ],
      );

    if (
      existing[0]
    ) {
      return Response.json(
        {
          error:
            "A user with this email already exists.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Credentials are generated when:
     *
     * 1. A brand-new OPEN resource
     *    is created.
     *
     * 2. An existing DRAFT resource
     *    is registered as OPEN.
     */
    const shouldIssueCredentials =
      value.lifecycle ===
        "OPEN" &&
      (
        !current ||
        current.lifecycle !==
          "OPEN"
      );

    const temporaryPassword =
      shouldIssueCredentials
        ? generateTempPassword()
        : "";

    const storedFormData =
      JSON.stringify(
        shouldIssueCredentials
          ? { ...value.formData, mustChangePassword: true }
          : value.formData,
      );

    let userId =
      current
        ? Number(
            current.id,
          )
        : 0;

    if (current) {
      if (
        shouldIssueCredentials
      ) {
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
              updated_at =
                CURRENT_TIMESTAMP

            WHERE
              id = ?
          `,
          [
            value.name,

            email,

            await hashPassword(
              temporaryPassword,
            ),

            normalizedRole,

            null,

            value.lifecycle,

            storedFormData,

            userId,
          ],
        );
      } else {
        /*
         * Normal edit.
         *
         * IMPORTANT:
         * Do not reset their password.
         */
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
              updated_at =
                CURRENT_TIMESTAMP

            WHERE
              id = ?
          `,
          [
            value.name,

            email,

            normalizedRole,

            null,

            value.lifecycle,

            storedFormData,

            userId,
          ],
        );
      }
    } else {
      /*
       * Drafts still need some hash
       * because users.password may be
       * non-nullable.
       *
       * The hidden draft password is
       * replaced when the draft is
       * registered.
       */
      const initialPassword =
        temporaryPassword ||
        randomBytes(
          18,
        ).toString(
          "base64url",
        );

      const [result] =
        await db.execute<
          ResultSetHeader
        >(
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

            email,

            await hashPassword(
              initialPassword,
            ),

            normalizedRole,

            null,

            value.lifecycle,

            storedFormData,
          ],
        );

      userId =
        result.insertId;
    }

    // Photo: bytes live in `user_avatars`, `users.avatar` holds the URL (F26).
    if (value.avatar !== undefined) {
      const avatarUrl = await persistUserAvatar(userId, value.avatar);
      await db.execute("UPDATE users SET avatar = ? WHERE id = ?", [
        avatarUrl,
        userId,
      ]);
    }

    await syncProjectAssignments(
      userId,

      typeof value
        .formData
        .projectId ===
        "string"
        ? value.formData
            .projectId
        : undefined,
    );

    let warning:
      | string
      | undefined;

    if (
      shouldIssueCredentials
    ) {
      try {
        await sendMail({
          to:
            email,

          subject:
            "Your Support Portal account has been created",

          html: `
            <p>Your resource account has been created.</p>

            <p>
              <strong>Email:</strong>
              ${email}
            </p>

            <p>
              <strong>Temporary Password:</strong>
              ${temporaryPassword}
            </p>

            <p>
              Please sign in and change your password.
            </p>
          `,
        });
      } catch (
        mailError
      ) {
        console.error(
          mailError,
        );

        warning =
          "Resource saved, but the onboarding email could not be sent.";
      }
    }

    return Response.json(
      {
        id:
          String(
            userId,
          ),

        lifecycle:
          value.lifecycle,

        role:
          normalizedRole,

        portal:
          portalForRole(
            normalizedRole,
          ),

        redirectTo:
          portalHomeForRole(
            normalizedRole,
          ),

        ...(warning
          ? {
              warning,
            }
          : {}),
      },
      {
        status:
          current
            ? 200
            : 201,
      },
    );
  } catch (
    error
  ) {
    if (error instanceof AvatarError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (
      error instanceof
      z.ZodError
    ) {
      return Response.json(
        {
          error:
            "Invalid resource data.",

          details:
            error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    console.error(
      error,
    );

    return Response.json(
      {
        error:
          "Unable to save resource.",
      },
      {
        status: 500,
      },
    );
  }
}
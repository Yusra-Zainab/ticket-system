import {
  z,
} from "zod";

import type {
  RowDataPacket,
} from "mysql2/promise";

import {
  getSessionUser,
  hashPassword,
} from "@/lib/auth";

import {
  db,
} from "@/lib/db";

import {
  formatUserRole,
  isAdminRole,
  isResourceRole,
  normalizeUserRole,
  portalForRole,
  portalHomeForRole,
  roleFromJobTitle,
} from "@/lib/userRoles";

/* =========================================================
   VALIDATION
   ========================================================= */

const schema =
  z.object({
    name:
      z
        .string()
        .trim()
        .min(2)
        .max(255)
        .optional(),

    email:
      z
        .string()
        .trim()
        .email()
        .optional(),

    role:
      z
        .string()
        .trim()
        .max(100)
        .optional(),

    avatar:
      z
        .string()
        .nullable()
        .optional(),

    lifecycle:
      z
        .enum([
          "OPEN",
          "DRAFT",
        ])
        .optional(),

    formData:
      z
        .record(
          z.string(),
          z.unknown(),
        )
        .optional(),

    password:
      z
        .string()
        .min(8)
        .max(200)
        .optional(),
  });

/* =========================================================
   TYPES
   ========================================================= */

type UserRow =
  RowDataPacket & {
    id:
      number;

    name:
      string;

    email:
      string;

    role:
      string;

    avatar:
      string |
      null;

    lifecycle:
      "OPEN" |
      "DRAFT";

    form_data:
      | string
      | Record<
          string,
          unknown
        >
      | null;
  };

type DuplicateRow =
  RowDataPacket & {
    id:
      number;
  };

/* =========================================================
   HELPERS
   ========================================================= */

function readFormData(
  value:
    UserRow["form_data"],
): Record<
  string,
  unknown
> {
  if (!value) {
    return {};
  }

  if (
    typeof value ===
      "object"
  ) {
    return value;
  }

  try {
    const parsed =
      JSON.parse(
        value,
      );

    if (
      parsed &&
      typeof parsed ===
        "object" &&
      !Array.isArray(
        parsed,
      )
    ) {
      return parsed as Record<
        string,
        unknown
      >;
    }
  } catch {
    // Invalid legacy JSON.
  }

  return {};
}

function formString(
  formData:
    Record<string, unknown>,

  key:
    string,
) {
  const value =
    formData[key];

  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

/*
 * Role/job-title normalization lives in lib/userRoles.ts.
 * Do not reimplement it here — a third local copy is exactly
 * how this and /api/resources previously drifted out of sync
 * and ended up writing incompatible role formats to the same
 * users.role column.
 */

async function requireAdminApiSession() {
  const user =
    await getSessionUser();

  if (!user) {
    return {
      error:
        Response.json(
          {
            error:
              "Authentication required.",
          },
          {
            status:
              401,
          },
        ),
    };
  }

  if (
    !isAdminRole(
      user.role,
    )
  ) {
    return {
      error:
        Response.json(
          {
            error:
              "Admin access required.",
          },
          {
            status:
              403,
          },
        ),
    };
  }

  return {
    user,
  };
}

async function findUser(
  id:
    string,
) {
  const [
    rows,
  ] =
    await db.query<
      UserRow[]
    >(
      `
        SELECT
          id,
          name,
          email,
          role,
          avatar,
          lifecycle,
          form_data

        FROM users

        WHERE
          id = ?

        LIMIT 1
      `,
      [
        id,
      ],
    );

  return rows[0];
}

/* =========================================================
   GET
   ========================================================= */

export async function GET(
  _request:
    Request,

  {
    params,
  }: {
    params:
      Promise<{
        id:
          string;
      }>;
  },
) {
  const session =
    await requireAdminApiSession();

  if (
    "error" in
    session
  ) {
    return session.error;
  }

  const {
    id,
  } =
    await params;

  const user =
    await findUser(
      id,
    );

  if (!user) {
    return Response.json(
      {
        error:
          "User not found.",
      },
      {
        status:
          404,
      },
    );
  }

  const formData =
    readFormData(
      user.form_data,
    );

  const storedJobTitle =
    formString(
      formData,
      "jobTitle",
    );

  return Response.json({
    id:
      String(
        user.id,
      ),

    name:
      user.name,

    email:
      user.email,

    role:
      user.role,

    avatar:
      user.avatar,

    lifecycle:
      user.lifecycle,

    formData: {
      ...formData,

      jobTitle:
        storedJobTitle ||
        formatUserRole(
          user.role,
        ),

      email:
        formString(
          formData,
          "email",
        ) ||
        user.email,

      workEmail:
        formString(
          formData,
          "workEmail",
        ) ||
        user.email,
    },

    portal:
      portalForRole(
        user.role,
      ),

    redirectTo:
      portalHomeForRole(
        user.role,
      ),
  });
}

/* =========================================================
   PATCH
   ========================================================= */

export async function PATCH(
  request:
    Request,

  {
    params,
  }: {
    params:
      Promise<{
        id:
          string;
      }>;
  },
) {
  try {
    const session =
      await requireAdminApiSession();

    if (
      "error" in
      session
    ) {
      return session.error;
    }

    const {
      id,
    } =
      await params;

    const current =
      await findUser(
        id,
      );

    if (!current) {
      return Response.json(
        {
          error:
            "User not found.",
        },
        {
          status:
            404,
        },
      );
    }

    const values =
      schema.parse(
        await request.json(),
      );

    const existingFormData =
      readFormData(
        current.form_data,
      );

    const submittedFormData =
      values.formData ??
      {};

    /* =====================================================
       JOB TITLE
       ===================================================== */

    const submittedJobTitle =
      formString(
        submittedFormData,
        "jobTitle",
      );

    const existingJobTitle =
      formString(
        existingFormData,
        "jobTitle",
      );

    const nextJobTitle =
      submittedJobTitle ||
      existingJobTitle ||
      formatUserRole(
        current.role,
      );

    if (!nextJobTitle) {
      return Response.json(
        {
          error:
            "Job title is required.",
        },
        {
          status:
            400,
        },
      );
    }

    /* =====================================================
       ROLE
       ===================================================== */

    let nextRole =
      roleFromJobTitle(
        nextJobTitle,
      );

    /*
     * Explicit request role may be used when
     * there is no useful Job Title.
     */
    if (
      !nextRole &&
      values.role
    ) {
      nextRole =
        normalizeUserRole(
          values.role,
        );
    }

    /*
     * Hard Super Admin rule.
     */
    if (
      normalizeUserRole(
        nextJobTitle,
      ) ===
        "superadmin"
    ) {
      nextRole =
        "superadmin";
    }

    if (!nextRole) {
      return Response.json(
        {
          error:
            "Unable to determine user role.",
        },
        {
          status:
            400,
        },
      );
    }

    /* =====================================================
       EMAIL
       ===================================================== */

    const submittedWorkEmail =
      formString(
        submittedFormData,
        "workEmail",
      );

    const nextEmail =
      (
        values.email ||
        submittedWorkEmail ||
        current.email
      )
        .trim()
        .toLowerCase();

    const [
      duplicates,
    ] =
      await db.query<
        DuplicateRow[]
      >(
        `
          SELECT
            id

          FROM users

          WHERE
            LOWER(email) =
              LOWER(?)

            AND
            id <> ?

          LIMIT 1
        `,
        [
          nextEmail,
          current.id,
        ],
      );

    if (
      duplicates[0]
    ) {
      return Response.json(
        {
          error:
            "A user with this email already exists.",
        },
        {
          status:
            409,
        },
      );
    }

    /* =====================================================
       FORM DATA
       ===================================================== */

    const nextFormData = {
      ...existingFormData,

      ...submittedFormData,

      jobTitle:
        nextJobTitle,

      role:
        nextRole,

      email:
        nextEmail,

      workEmail:
        nextEmail,
    };

    /* =====================================================
       UPDATE
       ===================================================== */

    const columns = [
      "name = ?",
      "email = ?",
      "role = ?",
      "avatar = ?",
      "lifecycle = ?",
      "form_data = ?",
    ];

    const parameters: (string | number | null)[] = [
        values.name ??
          current.name,

        nextEmail,

        nextRole,

        values.avatar !==
        undefined
          ? values.avatar
          : current.avatar,

        values.lifecycle ??
          current.lifecycle,

        JSON.stringify(
          nextFormData,
        ),
      ];

    if (
      values.password
    ) {
      columns.push(
        "password = ?",
      );

      parameters.push(
        await hashPassword(
          values.password,
        ),
      );
    }

    columns.push(
      "updated_at = CURRENT_TIMESTAMP",
    );

    parameters.push(
      current.id,
    );

    await db.execute(
      `
        UPDATE users

        SET
          ${columns.join(
            ",\n          ",
          )}

        WHERE
          id = ?
      `,
      parameters,
    );

    if (
      !isResourceRole(
        nextRole,
      )
    ) {
      await db.execute(
        `
          DELETE FROM
            project_resources

          WHERE
            user_id = ?
        `,
        [
          current.id,
        ],
      );
    }

    const oldRole =
      normalizeUserRole(
        current.role,
      );

    const newRole =
      normalizeUserRole(
        nextRole,
      );

    const roleChanged =
      oldRole !==
      newRole;

    const lifecycleChanged =
      current.lifecycle !==
      (
        values.lifecycle ??
        current.lifecycle
      );

    const emailChanged =
      current.email
        .trim()
        .toLowerCase() !==
      nextEmail;

    if (
      roleChanged ||
      lifecycleChanged ||
      emailChanged ||
      Boolean(
        values.password,
      )
    ) {
      await db.execute(
        `
          DELETE FROM
            auth_sessions

          WHERE
            user_id = ?
        `,
        [
          current.id,
        ],
      );
    }

    return Response.json({
      ok:
        true,

      id:
        String(
          current.id,
        ),

      name:
        values.name ??
        current.name,

      email:
        nextEmail,

      role:
        nextRole,

      jobTitle:
        nextJobTitle,

      lifecycle:
        values.lifecycle ??
        current.lifecycle,

      portal:
        portalForRole(
          nextRole,
        ),

      redirectTo:
        portalHomeForRole(
          nextRole,
        ),
    });
  } catch (
    error
  ) {
    if (
      error instanceof
      z.ZodError
    ) {
      return Response.json(
        {
          error:
            "Invalid user data.",

          details:
            error.flatten(),
        },
        {
          status:
            400,
        },
      );
    }

    console.error(
      "Unable to update user:",
      error,
    );

    return Response.json(
      {
        error:
          "Unable to update user.",
      },
      {
        status:
          500,
      },
    );
  }
}

/* =========================================================
   DELETE
   ========================================================= */

export async function DELETE(
  _request:
    Request,

  {
    params,
  }: {
    params:
      Promise<{
        id:
          string;
      }>;
  },
) {
  try {
    const session =
      await requireAdminApiSession();

    if (
      "error" in
      session
    ) {
      return session.error;
    }

    const {
      id,
    } =
      await params;

    const current =
      await findUser(
        id,
      );

    if (!current) {
      return Response.json(
        {
          error:
            "User not found.",
        },
        {
          status:
            404,
        },
      );
    }

    const connection =
      await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `
          DELETE FROM
            project_resources

          WHERE
            user_id = ?
        `,
        [
          current.id,
        ],
      );

      await connection.execute(
        `
          DELETE FROM
            auth_sessions

          WHERE
            user_id = ?
        `,
        [
          current.id,
        ],
      );

      await connection.execute(
        `
          DELETE FROM
            password_reset_tokens

          WHERE
            user_id = ?
        `,
        [
          current.id,
        ],
      );

      await connection.execute(
        `
          DELETE FROM users

          WHERE
            id = ?
        `,
        [
          current.id,
        ],
      );

      await connection.commit();
    } catch (
      error
    ) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }

    return Response.json({
      ok:
        true,
    });
  } catch (
    error
  ) {
    console.error(
      "Unable to delete user:",
      error,
    );

    return Response.json(
      {
        error:
          "Unable to delete user.",
      },
      {
        status:
          500,
      },
    );
  }
}
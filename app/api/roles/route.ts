import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { z } from "zod";

import { db } from "@/lib/db";

import { allPermissions } from "@/lib/rolePermissions";

const systemRoleNames = new Set([
  "Super Admin",
  "Project Manager",
  "Developer",
  "Support Agent",
  "Client User",
  "Admin",
]);

const schema = z.object({
  id: z.string().optional(),

  name: z.string().trim().min(3).max(100),

  description: z.string().trim().min(1).max(1000),

  roleType: z.string().trim().min(1).max(100),

  permissions: z.array(z.string()).min(1),
});

function cleanPermissions(permissions: string[]) {
  const allowed = new Set(allPermissions);

  return Array.from(
    new Set(permissions.filter((permission) => allowed.has(permission))),
  );
}

export async function POST(request: Request) {
  try {
    const values = schema.parse(await request.json());

    const permissions = cleanPermissions(values.permissions);

    if (!permissions.length) {
      return Response.json(
        {
          error: "Select at least one valid permission.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * New roles are ALWAYS custom.
     */
    const [result] = await db.execute<ResultSetHeader>(
      `
          INSERT INTO roles (
            name,
            description,
            role_type,
            type,
            permissions
          )

          VALUES (
            ?,
            ?,
            ?,
            'CUSTOM',
            ?
          )
        `,
      [
        values.name,
        values.description,
        values.roleType,
        JSON.stringify(permissions),
      ],
    );

    return Response.json(
      {
        ok: true,

        id: String(result.insertId),

        type: "CUSTOM",
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Invalid role information.",

          details: error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const mysqlError = error as {
      code?: string;
    };

    if (mysqlError.code === "ER_DUP_ENTRY") {
      return Response.json(
        {
          error: "A role with this name already exists.",
        },
        {
          status: 409,
        },
      );
    }

    console.error("Unable to create role:", error);

    return Response.json(
      {
        error: "Unable to create role.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const values = schema.parse(await request.json());

    const id = Number(values.id);

    if (!Number.isInteger(id) || id <= 0) {
      return Response.json(
        {
          error: "Invalid role id.",
        },
        {
          status: 400,
        },
      );
    }

    const [rows] = await db.query<
      (RowDataPacket & {
        name: string;

        type: "SYSTEM" | "CUSTOM";
      })[]
    >(
      `
          SELECT
            name,
            type

          FROM roles

          WHERE id = ?

          LIMIT 1
        `,
      [id],
    );

    const current = rows[0];

    if (!current) {
      return Response.json(
        {
          error: "Role not found.",
        },
        {
          status: 404,
        },
      );
    }

    const permissions = cleanPermissions(values.permissions);

    /*
     * System role names cannot
     * be changed.
     */
    const roleName = current.type === "SYSTEM" ? current.name : values.name;

    await db.execute(
      `
        UPDATE roles

        SET
          name = ?,
          description = ?,
          role_type = ?,
          permissions = ?,
          updated_at = CURRENT_TIMESTAMP

        WHERE id = ?
      `,
      [
        roleName,
        values.description,
        values.roleType,
        JSON.stringify(permissions),
        id,
      ],
    );

    return Response.json({
      ok: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Invalid role information.",
        },
        {
          status: 400,
        },
      );
    }

    console.error("Unable to update role:", error);

    return Response.json(
      {
        error: "Unable to update role.",
      },
      {
        status: 500,
      },
    );
  }
}

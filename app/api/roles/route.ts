import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { z } from "zod";

import { requireApiPermission } from "@/lib/apiPermissions";
import { db } from "@/lib/db";
import { allPermissions } from "@/lib/rolePermissions";
import { normalizeUserRole } from "@/lib/userRoles";

const schema = z.object({
  id: z.string().optional(),

  name: z.string().trim().min(3).max(100),

  description: z.string().trim().min(1).max(1000),

  roleType: z.string().trim().min(1).max(100),

  permissions: z.array(z.string()).min(1),

  permissionScopes: z.record(z.string(), z.enum(["ALL", "ASSIGNED_ONLY"])).default({}),
});

function cleanPermissions(permissions: string[]) {
  const allowed = new Set(allPermissions);

  return Array.from(
    new Set(permissions.filter((permission) => allowed.has(permission))),
  );
}

function cleanPermissionScopes(
  scopes: Record<string, "ALL" | "ASSIGNED_ONLY">,
  permissions: string[],
) {
  const allowed = new Set(permissions);
  const cleaned: Record<string, "ALL" | "ASSIGNED_ONLY"> = {};

  for (const [permission, scope] of Object.entries(scopes)) {
    if (!allowed.has(permission)) continue;
    cleaned[permission] = scope;
  }

  return cleaned;
}

/*
 * CREATE ROLE
 */
export async function POST(request: Request) {
  const auth = await requireApiPermission("Create Roles");

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const values = schema.parse(await request.json());

    const permissions = cleanPermissions(values.permissions);
    const permissionScopes = cleanPermissionScopes(
      values.permissionScopes,
      permissions,
    );

    /*
     * It is possible for the incoming array to satisfy Zod's
     * min(1) check but contain only unknown/invalid permissions.
     */
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
     * New roles are always CUSTOM.
     *
     * SYSTEM status is controlled internally and cannot be
     * supplied by the client.
     */
    const [result] = await db.execute<ResultSetHeader>(
      `
        INSERT INTO roles (
          name,
          description,
          role_type,
          type,
          permissions,
          permission_scopes
        )

        VALUES (
          ?,
          ?,
          ?,
          'CUSTOM',
          ?,
          ?
        )
      `,
      [
        values.name,
        values.description,
        values.roleType,
        JSON.stringify(permissions),
        JSON.stringify(permissionScopes),
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

/*
 * UPDATE ROLE
 */
export async function PATCH(request: Request) {
  const auth = await requireApiPermission("Edit Roles");

  if ("response" in auth) {
    return auth.response;
  }

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

    /*
     * Read the existing role first because:
     *
     * 1. SYSTEM role names must remain immutable.
     * 2. CUSTOM role renames require existing users to be
     *    migrated from the old normalized role slug to the new one.
     */
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
    const permissionScopes = cleanPermissionScopes(
      values.permissionScopes,
      permissions,
    );

    /*
     * As with POST, reject an update if every submitted
     * permission was invalid and therefore removed.
     */
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
     * SYSTEM role names cannot be changed.
     *
     * A client may submit a different name, but the current
     * database name wins for SYSTEM roles.
     */
    const roleName =
      current.type === "SYSTEM"
        ? current.name
        : values.name;

    /*
     * Users store normalized role values rather than relying
     * directly on the display name.
     *
     * Therefore a custom role rename can also change the value
     * used by getRolePermissions() when matching the user's role.
     */
    const oldSlug = normalizeUserRole(current.name);
    const newSlug = normalizeUserRole(roleName);

    await db.execute(
      `
        UPDATE roles

        SET
          name = ?,
          description = ?,
          role_type = ?,
          permissions = ?,
          permission_scopes = ?,
          updated_at = CURRENT_TIMESTAMP

        WHERE id = ?
      `,
      [
        roleName,
        values.description,
        values.roleType,
        JSON.stringify(permissions),
        JSON.stringify(permissionScopes),
        id,
      ],
    );

    /*
     * IMPORTANT:
     *
     * When a CUSTOM role's display name changes, migrate every
     * user still carrying the old normalized slug.
     *
     * Without this migration:
     *
     *   old role name
     *        ↓
     *   old normalized slug remains in users.role
     *        ↓
     *   roles table now contains only the new name/slug
     *        ↓
     *   getRolePermissions() can no longer match the resource
     *        ↓
     *   resource silently appears to lose its permissions
     *
     * SYSTEM role renames never reach this branch because their
     * roleName is forced to current.name, making both slugs equal.
     */
    if (oldSlug !== newSlug) {
      await db.execute(
        `
          UPDATE users

          SET
            role = ?,
            updated_at = CURRENT_TIMESTAMP

          WHERE role = ?
        `,
        [newSlug, oldSlug],
      );
    }

    return Response.json({
      ok: true,
    });
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
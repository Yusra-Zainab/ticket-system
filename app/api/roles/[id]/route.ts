import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { requireApiPermission } from "@/lib/apiPermissions";
import { db } from "@/lib/db";
import { normalizeUserRole } from "@/lib/userRoles";

type RoleRow = RowDataPacket & {
  id: number;
  name: string;
  type: "SYSTEM" | "CUSTOM";
};

/*
 * Delete a CUSTOM role (F8 — the "Delete Custom Roles" permission had
 * no implementation). SYSTEM roles are protected; a role still assigned
 * to users can't be deleted until they're moved off it.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiPermission("Delete Custom Roles");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const roleId = Number(id);

  if (!Number.isInteger(roleId) || roleId <= 0) {
    return Response.json({ error: "Invalid role id." }, { status: 400 });
  }

  const [rows] = await db.query<RoleRow[]>(
    "SELECT id, name, type FROM roles WHERE id = ? LIMIT 1",
    [roleId],
  );
  const role = rows[0];

  if (!role) {
    return Response.json({ error: "Role not found." }, { status: 404 });
  }

  if (role.type === "SYSTEM") {
    return Response.json(
      { error: "System roles cannot be deleted." },
      { status: 403 },
    );
  }

  const slug = normalizeUserRole(role.name);
  const [assigned] = await db.query<(RowDataPacket & { count: number })[]>(
    `SELECT COUNT(*) AS count FROM users
       WHERE (role = ? OR role = ?)
         AND (lifecycle IS NULL OR lifecycle = 'OPEN')`,
    [role.name, slug],
  );

  if (Number(assigned[0]?.count ?? 0) > 0) {
    return Response.json(
      {
        error: `${assigned[0]!.count} user(s) still have this role. Reassign them first.`,
      },
      { status: 409 },
    );
  }

  await db.execute<ResultSetHeader>("DELETE FROM roles WHERE id = ?", [roleId]);

  return Response.json({ ok: true });
}

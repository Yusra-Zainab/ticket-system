import "server-only";

import type { AuthUser } from "@/lib/auth";
import { getSessionUser } from "@/lib/auth";
import { getRolePermissions } from "@/lib/db";

type ApiPermissionResult =
  | {
      user: AuthUser;
      permissions: string[];
    }
  | {
      response: Response;
    };

function unauthorized(message: string, status: 401 | 403) {
  return Response.json({ error: message }, { status });
}

export async function requireApiPermission(
  permission: string,
): Promise<ApiPermissionResult> {
  const user = await getSessionUser();

  if (!user) {
    return {
      response: unauthorized("Authentication required.", 401),
    };
  }

  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes(permission)) {
    return {
      response: unauthorized("Permission denied.", 403),
    };
  }

  return {
    user,
    permissions,
  };
}

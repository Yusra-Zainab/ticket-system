import { notFound } from "next/navigation";

import RoleForm from "@/components/features/RoleForm";
import { requireResourcePageSession } from "@/lib/auth";
import { findRole, getRolePermissions } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourcePortalRoleFormPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  const { role: roleId } = await searchParams;
  const editing = Boolean(roleId);

  const requiredPermission = editing ? "Edit Roles" : "Create Roles";

  if (!permissions.includes(requiredPermission)) {
    notFound();
  }

  const role = roleId ? await findRole(roleId) : undefined;

  if (roleId && !role) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <RoleForm initialRole={role} rolesListHref="/resource-portal/roles" />
    </div>
  );
}

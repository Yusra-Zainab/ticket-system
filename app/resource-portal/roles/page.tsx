import { Plus } from "lucide-react";
import { notFound } from "next/navigation";

import RolesTable from "@/components/features/RolesTable";
import PageHeader from "@/components/ui/PageHeader";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions, listRoles } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourcePortalRolesPage() {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("View Roles")) {
    notFound();
  }

  const roles = await listRoles();
  const canCreate = permissions.includes("Create Roles");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        action={canCreate ? "New Role" : undefined}
        actionHref={canCreate ? "/resource-portal/roles/new" : undefined}
        actionIcon={Plus}
      />

      <RolesTable
        initialRoles={roles}
        roleFormHref="/resource-portal/roles/new"
      />
    </div>
  );
}

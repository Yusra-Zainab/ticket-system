import { Plus } from "lucide-react";

import RolesTable from "@/components/features/RolesTable";
import PageHeader from "@/components/ui/PageHeader";

import { listRoles } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const roles = await listRoles();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        action="New Role"
        actionHref="/admin/roles/new"
        actionIcon={Plus}
      />

      <RolesTable initialRoles={roles} />
    </div>
  );
}

import { Plus } from "lucide-react";
import { notFound } from "next/navigation";

import ResourcesTable from "@/components/features/ResourcesTable";
import PageHeader from "@/components/ui/PageHeader";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions, listResourceRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourcePortalResourcesPage() {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("View Resources")) {
    notFound();
  }

  const resources = await listResourceRows("OPEN");
  const canCreate = permissions.includes("Create Resources");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources List"
        action={canCreate ? "New Resource" : undefined}
        actionHref={canCreate ? "/resource-portal/resources/new" : undefined}
        actionIcon={Plus}
      />

      <ResourcesTable
        initialResources={resources}
        detailBaseHref="/resource-portal/resources"
      />
    </div>
  );
}

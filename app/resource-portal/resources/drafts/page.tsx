import { notFound } from "next/navigation";

import PageHeader from "@/components/ui/PageHeader";
import ResourcesTable from "@/components/features/ResourcesTable";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions, listResourceRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourcePortalResourceDraftsPage() {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("Create Resources")) {
    notFound();
  }

  const drafts = await listResourceRows("DRAFT");

  return (
    <div className="space-y-6">
      <PageHeader title="Resource Drafts" />

      <ResourcesTable
        initialResources={drafts}
        variant="drafts"
        detailBaseHref="/resource-portal/resources"
      />
    </div>
  );
}

import { notFound } from "next/navigation";

import ClientDraftsTable from "@/components/features/ClientDraftsTable";
import PageHeader from "@/components/ui/PageHeader";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions, listClientDraftRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourcePortalClientDraftsPage() {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("Create Clients")) {
    notFound();
  }

  const drafts = await listClientDraftRows();

  return (
    <div className="space-y-6">
      <PageHeader title="Client Drafts" />

      <ClientDraftsTable
        initialDrafts={drafts}
        detailBaseHref="/resource-portal/clients"
      />
    </div>
  );
}

import ClientDraftsTable from "@/components/features/ClientDraftsTable";
import PageHeader from "@/components/ui/PageHeader";

import { listClientDraftRows } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ClientDraftsPage() {
  const drafts = await listClientDraftRows();

  return (
    <div className="space-y-6">
      <PageHeader title="Client Drafts" />

      <ClientDraftsTable initialDrafts={drafts} />
    </div>
  );
}

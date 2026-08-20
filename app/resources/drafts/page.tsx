import PageHeader from "@/components/ui/PageHeader";
import ResourcesTable from "@/components/features/ResourcesTable";

import { listResourceRows } from "@/lib/db";

export default async function ResourceDraftsPage() {
  const drafts = await listResourceRows("DRAFT");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resource Drafts"
      />

      <ResourcesTable initialResources={drafts} variant="drafts" />
    </div>
  );
}

import { Plus } from "lucide-react";

import ResourcesTable from "@/components/features/ResourcesTable";
import PageHeader from "@/components/ui/PageHeader";
import { listResourceRows } from "@/lib/db";

export default async function ResourcesPage() {
  const resources =
    await listResourceRows(
      "OPEN",
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources List"
        action="New Resource"
        actionHref="/resources/new"
        actionIcon={Plus}
      />

      <ResourcesTable
        initialResources={
          resources
        }
      />
    </div>
  );
}
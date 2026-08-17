import { Plus } from "lucide-react";
import DirectoryTable from "@/components/features/DirectoryTable";
import PageHeader from "@/components/ui/PageHeader";
export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description="Balance team capacity, expertise, and project assignments."
        action="New resource"
        actionHref="/resources/new"
        actionIcon={Plus}
      />
      <DirectoryTable type="resources" />
    </div>
  );
}

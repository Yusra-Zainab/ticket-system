import EntityForm from "@/components/features/EntityForm";
import PageHeader from "@/components/ui/PageHeader";
export default function NewResourcePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Create resource"
        description="Add a team member, skills, and available capacity."
      />
      <EntityForm kind="resource" />
    </div>
  );
}

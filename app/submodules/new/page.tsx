import ModuleForm from "@/components/features/ModuleForm";
import PageHeader from "@/components/ui/PageHeader";

export default async function NewSubModulePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; projectName?: string }>;
}) {
  const { project, projectName } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Create Sub Module"
        description={
          projectName
            ? `Add a specific section to ${projectName}.`
            : "Add a specific section and its related URL."
        }
      />
      <ModuleForm
        kind="subModule"
        projectId={project}
        projectName={projectName}
      />
    </div>
  );
}

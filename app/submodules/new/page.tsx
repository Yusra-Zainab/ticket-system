import ModuleForm from "@/components/features/ModuleForm";
import PageHeader from "@/components/ui/PageHeader";

export default async function NewSubModulePage({
  searchParams,
}: {
  searchParams: Promise<{
    project?: string;
    projectId?: string;
    projectName?: string;
    returnTo?: string;
  }>;
}) {
  const { project, projectId, projectName, returnTo } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="New Sub Module"
        description={
          projectName
            ? `Add a specific section to ${projectName}.`
            : "Add a specific section and its related URL."
        }
      />
      <ModuleForm
        kind="subModule"
        projectId={projectId ?? project}
        projectName={projectName}
        returnTo={returnTo}
      />
    </div>
  );
}

import ModuleForm from "@/components/features/ModuleForm";
import PageHeader from "@/components/ui/PageHeader";

export default async function NewModulePage({
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
        title="New Module"
        description={
          projectName
            ? `Add a project area to ${projectName}.`
            : "Add a project area and its related URL."
        }
      />
      <ModuleForm
        kind="module"
        projectId={projectId ?? project}
        projectName={projectName}
        returnTo={returnTo}
      />
    </div>
  );
}

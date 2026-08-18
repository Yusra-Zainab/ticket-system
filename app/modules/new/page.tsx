import ModuleForm from "@/components/features/ModuleForm";
import PageHeader from "@/components/ui/PageHeader";

export default async function NewModulePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; projectName?: string }>;
}) {
  const { project, projectName } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Create Module"
        description={
          projectName
            ? `Add a project area to ${projectName}.`
            : "Add a project area and its related URL."
        }
      />
      <ModuleForm kind="module" projectId={project} projectName={projectName} />
    </div>
  );
}

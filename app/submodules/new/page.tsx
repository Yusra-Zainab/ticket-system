import ModuleForm from "@/components/features/ModuleForm";
import PageHeader from "@/components/ui/PageHeader";
export default function NewSubModulePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Create Sub Module"
        description="Add a specific section and its related URL."
      />
      <ModuleForm kind="subModule" />
    </div>
  );
}

import ModuleForm from '@/components/features/ModuleForm';
import PageHeader from '@/components/ui/PageHeader';
export default function NewModulePage() { return <div className="mx-auto max-w-3xl space-y-6"><PageHeader title="Create Module" description="Add a project area and its related URL." /><ModuleForm kind="module" /></div>; }

import EntityForm from '@/components/features/EntityForm'; import PageHeader from '@/components/ui/PageHeader';
export default function NewProjectPage() { return <div className="mx-auto max-w-4xl space-y-6"><PageHeader title="Create project" description="Set the scope, team, and delivery timeline." /><EntityForm kind="project" /></div>; }

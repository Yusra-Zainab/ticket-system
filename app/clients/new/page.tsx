import EntityForm from '@/components/features/EntityForm'; import PageHeader from '@/components/ui/PageHeader';
export default function NewClientPage() { return <div className="mx-auto max-w-4xl space-y-6"><PageHeader title="Create client" description="Add contact information and account context." /><EntityForm kind="client" /></div>; }

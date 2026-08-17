import RoleForm from '@/components/features/RoleForm'; import PageHeader from '@/components/ui/PageHeader';
export default function NewRolePage() { return <div className="mx-auto max-w-3xl space-y-6"><PageHeader title="Create role" description="Choose a clear name and grant only the permissions this role needs." /><RoleForm /></div>; }

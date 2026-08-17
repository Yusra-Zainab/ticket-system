import EmailSettingsForm from '@/components/features/EmailSettingsForm'; import PageHeader from '@/components/ui/PageHeader';
export default function EmailSettingsPage() { return <div className="mx-auto max-w-3xl space-y-6"><PageHeader title="Email configuration" description="Configure SMTP delivery for notifications and password recovery." /><EmailSettingsForm /></div>; }

import { Plus } from 'lucide-react';
import ProjectsTable from '@/components/features/ProjectsTable';
import PageHeader from '@/components/ui/PageHeader';
export default function ProjectsPage() { return <div className="space-y-6"><PageHeader title="Projects" description="Monitor delivery health, ownership, and client timelines." action="New project" actionHref="/projects/new" actionIcon={Plus} /><ProjectsTable /></div>; }

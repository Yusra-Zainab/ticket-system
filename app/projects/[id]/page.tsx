import { notFound } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader'; import ProjectTabs from '@/components/features/ProjectTabs'; import { mockProjects } from '@/data/mockData';
export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const project = mockProjects.find((item) => item.id === id); if (!project) notFound(); return <div className="space-y-6"><PageHeader title={project.name} description={`${project.client} · Project workspace`} /><ProjectTabs project={project} /></div>; }

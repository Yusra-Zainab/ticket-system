import PageHeader from "@/components/ui/PageHeader";
import ClientProjectList from "@/components/client-portal/ClientProjectList";
import { requireClientPageSession } from "@/lib/auth";
import { listClientProjects } from "@/lib/clientPortal";

export const dynamic = "force-dynamic";

export default async function ClientProjectsPage() {
  const user = await requireClientPageSession();
  const projects = await listClientProjects(user);

  return (
    <div className="space-y-6">
      <PageHeader title="Projects List" />
      <ClientProjectList projects={projects} />
    </div>
  );
}
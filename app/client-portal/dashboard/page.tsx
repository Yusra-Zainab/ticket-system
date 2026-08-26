import ClientDashboardView from "@/components/client-portal/ClientDashboardView";
import { requireClientPageSession } from "@/lib/auth";
import {
  getClientDashboardStats,
  listClientProjects,
  listClientTickets,
} from "@/lib/clientPortal";

export const dynamic = "force-dynamic";

export default async function ClientDashboardPage() {
  const user = await requireClientPageSession();

  const [stats, projects, tickets] = await Promise.all([
    getClientDashboardStats(user),
    listClientProjects(user),
    listClientTickets(user, "OPEN"),
  ]);

  return (
    <ClientDashboardView
      stats={stats}
      projects={projects}
      tickets={tickets}
    />
  );
}
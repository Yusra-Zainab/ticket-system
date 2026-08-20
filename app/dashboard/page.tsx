import AdminDashboard from "@/components/features/AdminDashboard";

import {
  listClientRows,
  listProjects,
  listResourceRows,
  listTickets,
} from "@/lib/db";

export default async function DashboardPage() {
  const [
    projects,
    tickets,
    resources,
    clients,
  ] = await Promise.all([
    listProjects("OPEN"),
    listTickets("OPEN"),
    listResourceRows("OPEN"),
    listClientRows(),
  ]);

  /*
   * Generate time on the server.
   * The client component receives a stable value,
   * so React does not flag Date.now() as impure.
   */
  const now = new Date().getTime();

  return (
    <AdminDashboard
      projects={projects}
      tickets={tickets}
      resources={resources}
      clients={clients}
      now={now}
    />
  );
}
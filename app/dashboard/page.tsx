import AdminDashboard from "@/components/features/AdminDashboard";

import {
  findAdminUser,
  listClientRows,
  listProjects,
  listResourceRows,
  listTickets,
} from "@/lib/db";
import { requireAdminPageSession } from "@/lib/auth";
import { defaultProfileTimeZone } from "@/lib/profileUtils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessionUser = await requireAdminPageSession();
  const [projects, tickets, resources, clients, profile] = await Promise.all([
    listProjects("OPEN"),
    listTickets("OPEN"),
    listResourceRows("OPEN"),
    listClientRows(),
    findAdminUser(String(sessionUser.id)),
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
      timeZone={profile?.formData.timeZone || defaultProfileTimeZone}
    />
  );
}

import { redirect } from "next/navigation";

import AdminDashboard from "@/components/features/AdminDashboard";
import { portalForRole, requirePageSession } from "@/lib/auth";
import {
  findAdminUser,
  listClientRows,
  listProjects,
  listResourceRows,
  listTickets,
} from "@/lib/db";
import { defaultProfileTimeZone } from "@/lib/profileUtils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessionUser = await requirePageSession();
  const portal = portalForRole(sessionUser.role);

  if (portal === "client") {
    redirect("/client/dashboard");
  }

  if (portal === "resource") {
    redirect("/resource/dashboard");
  }

  const [projects, tickets, resources, clients, profile] = await Promise.all([
    listProjects("OPEN"),
    listTickets("OPEN"),
    listResourceRows("OPEN"),
    listClientRows(),
    findAdminUser(String(sessionUser.id)),
  ]);
  return (
    <AdminDashboard
      projects={projects}
      tickets={tickets}
      resources={resources}
      clients={clients}
      now={Date.now()}
      timeZone={profile?.formData.timeZone || defaultProfileTimeZone}
    />
  );
}

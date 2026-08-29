import { notFound } from "next/navigation";

import ClientDetailsView from "@/components/features/ClientDetailsView";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions, findClientRecord, listProjects, listTickets, listUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourcePortalClientDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("View Clients")) {
    notFound();
  }

  const { id } = await params;
  const { tab } = await searchParams;

  const canEditClient = permissions.includes("Edit Clients");
  const canAssignClientProjects = permissions.includes("Assign Client Projects");
  const canManageClientTeam = permissions.includes("Manage Client Team");

  const [client, projects, tickets, users] = await Promise.all([
    findClientRecord(id),
    listProjects("OPEN"),
    listTickets("OPEN"),
    listUsers(),
  ]);

  if (!client || client.lifecycle !== "OPEN") {
    notFound();
  }

  return (
    <ClientDetailsView
      client={client}
      projects={projects}
      tickets={tickets}
      users={users}
      initialTab={tab}
      allowClientEdit={canEditClient}
      allowAssignClientProjects={canAssignClientProjects}
      allowManageClientTeam={canManageClientTeam}
      clientBaseHref="/resource-portal/clients"
      ticketBaseHref="/resource-portal/tickets"
    />
  );
}

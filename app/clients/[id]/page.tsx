import { notFound } from "next/navigation";

import ClientDetailsView from "@/components/features/ClientDetailsView";

import {
  findClientRecord,
  listProjects,
  listTickets,
  listUsers,
} from "@/lib/db";

export default async function ClientDetailsPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

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
    />
  );
}

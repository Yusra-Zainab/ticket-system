import { notFound } from "next/navigation";

import ClientDetailsView from "@/components/features/ClientDetailsView";

import {
  findClientRecord,
  listProjects,
  listTickets,
  listUsers,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ClientDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

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
    />
  );
}

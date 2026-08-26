import { notFound } from "next/navigation";

import ClientProjectDetailsView from "@/components/client-portal/ClientProjectDetailsView";
import { requireClientPageSession } from "@/lib/auth";
import {
  findClientProject,
  listClientTickets,
} from "@/lib/clientPortal";

export const dynamic = "force-dynamic";

export default async function ClientProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClientPageSession();
  const { id } = await params;

  const [project, tickets] = await Promise.all([
    findClientProject(user, id),
    listClientTickets(user, "OPEN"),
  ]);

  if (!project) {
    notFound();
  }

  return <ClientProjectDetailsView project={project} tickets={tickets} />;
}
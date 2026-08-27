import { notFound } from "next/navigation";

import PortalProjectDetailsView from "@/components/features/PortalProjectDetailsView";

import { requireClientPageSession } from "@/lib/auth";

import { findClientProject, listClientTickets } from "@/lib/clientPortal";

import { listProjectModuleTicketStatsForAuthorizedProject } from "@/lib/projectModuleTicketStats";

export const dynamic = "force-dynamic";

export default async function ClientProjectDetailsPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const user = await requireClientPageSession();

  const { id } = await params;

  /*
   * SECURITY:
   *
   * Do this before the module stats query.
   *
   * findClientProject() verifies that this project
   * belongs to the current client's client_id.
   */
  const project = await findClientProject(user, id);

  if (!project) {
    notFound();
  }

  /*
   * Now that project access is confirmed,
   * load the Client-scoped tickets and the
   * DB-backed module ticket counts.
   */
  const [tickets, moduleTicketStats] = await Promise.all([
    listClientTickets(user, "OPEN"),

    listProjectModuleTicketStatsForAuthorizedProject(project.id),
  ]);

  return (
    <PortalProjectDetailsView
      portal="client"
      project={project}
      tickets={tickets}
      moduleTicketStats={moduleTicketStats}
    />
  );
}

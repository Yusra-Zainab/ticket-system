import { notFound } from "next/navigation";

import PortalProjectDetailsView from "@/components/features/PortalProjectDetailsView";

import { requireResourcePageSession } from "@/lib/auth";

import { listProjectModuleTicketStatsForAuthorizedProject } from "@/lib/projectModuleTicketStats";

import { findResourceProject, listResourceTickets } from "@/lib/resourcePortal";

export const dynamic = "force-dynamic";

export default async function ResourceProjectDetailsPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const user = await requireResourcePageSession();

  const { id } = await params;

  /*
   * SECURITY:
   *
   * This verifies the project is assigned to
   * the logged-in resource through
   * project_resources.
   */
  const project = await findResourceProject(user, id);

  if (!project) {
    notFound();
  }

  /*
   * Only after the project assignment check passes
   * do we query module ticket statistics.
   */
  const [tickets, moduleTicketStats] = await Promise.all([
    listResourceTickets(user, "OPEN"),

    listProjectModuleTicketStatsForAuthorizedProject(project.id),
  ]);

  return (
    <div className="px-5 sm:px-8 lg:px-12 xl:px-16">
      <PortalProjectDetailsView
        portal="resource"
        project={project}
        tickets={tickets}
        moduleTicketStats={moduleTicketStats}
      />
    </div>
  );
}

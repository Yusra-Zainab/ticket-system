import PortalProjectsTable, {
  type PortalProjectListItem,
} from "@/components/features/PortalProjectsTable";
import PageHeader from "@/components/ui/PageHeader";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions } from "@/lib/db";
import { getProjectListTicketMetrics } from "@/lib/projectListMetrics";
import { listResourceProjects } from "@/lib/resourcePortal";

export const dynamic =
  "force-dynamic";

export default async function ResourceProjectsPage() {
  const user =
    await requireResourcePageSession();

  const permissions = await getRolePermissions(user.role);
  const canViewProjects = permissions.includes("View Projects");

  /*
   * Existing DB authorization stays intact.
   *
   * listResourceProjects() starts from project_resources and therefore only
   * returns projects assigned to the logged-in resource.
   */
  const projects = canViewProjects
    ? await listResourceProjects(
        user,
      )
    : [];

  /*
   * Match the Admin project's Open Tickets / Critical calculations.
   *
   * Only IDs already returned by listResourceProjects() are supplied here.
   */
  const ticketMetrics =
    await getProjectListTicketMetrics(
      projects.map(
        (project) =>
          project.id,
      ),
    );

  const rows: PortalProjectListItem[] =
    projects.map(
      (project) => {
        const metrics =
          ticketMetrics.get(
            project.id,
          );

        return {
          id: project.id,

          name:
            project.name,

          client:
            project.client ||
            "Unassigned",

          status:
            project.status,

          openTickets:
            metrics?.openTickets ??
            project.openTickets,

          criticalTickets:
            metrics?.criticalTickets ??
            0,

          teamMembers:
            project.team,

          lastUpdated:
            project.updatedAt,
        };
      },
    );

  return (
    <div className="mt-7 space-y-6 px-5 sm:px-8 lg:px-12 xl:px-16">
      <PageHeader title="Projects List" />

      {canViewProjects ? (
        <PortalProjectsTable
          projects={rows}
          projectHrefBase="/resource-portal/projects"
        />
      ) : null}
    </div>
  );
}
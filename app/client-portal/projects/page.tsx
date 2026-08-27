import PortalProjectsTable, {
  type PortalProjectListItem,
} from "@/components/features/PortalProjectsTable";
import PageHeader from "@/components/ui/PageHeader";
import { requireClientPageSession } from "@/lib/auth";
import { listClientProjects } from "@/lib/clientPortal";
import { getProjectListTicketMetrics } from "@/lib/projectListMetrics";

export const dynamic =
  "force-dynamic";

export default async function ClientProjectsPage() {
  const user =
    await requireClientPageSession();

  /*
   * This existing function is still responsible for access control.
   * It only returns projects belonging to the logged-in client's client_id.
   */
  const projects =
    await listClientProjects(
      user,
    );

  /*
   * Calculate the same ticket counters that the Admin projects list uses,
   * but only for the already-authorized client project IDs.
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
            project.company ||
            "Unassigned",

          status:
            project.status,

          openTickets:
            metrics?.openTickets ??
            project.openTickets,

          criticalTickets:
            metrics?.criticalTickets ??
            project.criticalTickets ??
            0,

          teamMembers:
            project.team,

          lastUpdated:
            project.updatedAt,
        };
      },
    );

  return (
    <div className="space-y-6">
      <PageHeader title="Projects List" />

      <PortalProjectsTable
        projects={rows}
        projectHrefBase="/client-portal/projects"
      />
    </div>
  );
}
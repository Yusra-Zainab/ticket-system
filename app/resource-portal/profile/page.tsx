import ResourceProfileView from "@/components/resource-portal/ResourceProfileView";
import { requireResourcePageSession } from "@/lib/auth";
import {
  getResourceProfile,
  listResourceProjects,
  listResourceTickets,
} from "@/lib/resourcePortal";

export const dynamic = "force-dynamic";

export default async function ResourceProfilePage() {
  const user = await requireResourcePageSession();

  const [profile, projects, tickets] = await Promise.all([
    getResourceProfile(user),
    listResourceProjects(user),
    listResourceTickets(user, "OPEN"),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <ResourceProfileView
        profile={profile}
        projects={projects}
        tickets={tickets}
      />
    </div>
  );
}

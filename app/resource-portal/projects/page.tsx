import { Plus } from "lucide-react";
import { notFound } from "next/navigation";

import ProjectsTable from "@/components/features/ProjectsTable";
import PageHeader from "@/components/ui/PageHeader";
import { requireResourcePageSession } from "@/lib/auth";
import {
  getRolePermissionScope,
  getRolePermissions,
  listProjects,
} from "@/lib/db";
import { listAssignedProjectIds } from "@/lib/resourcePortal";

export const dynamic = "force-dynamic";

export default async function ResourceProjectsPage() {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("View Projects")) {
    notFound();
  }

  const canCreateProjects = permissions.includes("Create Projects");

  const [allProjects, scope] = await Promise.all([
    listProjects("OPEN"),
    getRolePermissionScope(user.role, "View Projects"),
  ]);

  let projects = allProjects;

  if (scope === "ASSIGNED_ONLY") {
    const assigned = await listAssignedProjectIds(user.id);
    projects = allProjects.filter((project) => assigned.has(project.id));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects List"
        action={canCreateProjects ? "New Project" : undefined}
        actionHref={canCreateProjects ? "/resource-portal/projects/new" : undefined}
        actionIcon={Plus}
      />

      <ProjectsTable
        initialProjects={projects}
        projectHrefBase="/resource-portal/projects"
      />
    </div>
  );
}

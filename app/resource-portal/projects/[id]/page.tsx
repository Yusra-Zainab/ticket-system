import { notFound } from "next/navigation";

import ProjectDetailsView from "@/components/features/ProjectDetailsView";
import { requireResourcePageSession } from "@/lib/auth";
import {
  findProject,
  getRolePermissionScope,
  getRolePermissions,
  listTickets,
  listUsers,
} from "@/lib/db";
import { resourceHasProject } from "@/lib/resourcePortal";

export const dynamic = "force-dynamic";

export default async function ResourceProjectDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; tab?: string }>;
}) {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("View Projects")) {
    notFound();
  }

  const { id } = await params;
  const { saved, tab } = await searchParams;

  const [project, tickets, users, scope] = await Promise.all([
    findProject(id),
    listTickets("OPEN"),
    listUsers(),
    getRolePermissionScope(user.role, "View Projects"),
  ]);

  if (!project || project.lifecycle !== "OPEN") {
    notFound();
  }

  if (scope === "ASSIGNED_ONLY") {
    const assigned = await resourceHasProject(user.id, id);

    if (!assigned) {
      notFound();
    }
  }

  const canEditProjects = permissions.includes("Edit Projects");
  const canCreateProjects = permissions.includes("Create Projects");
  const canCreateTickets = permissions.includes("Create Tickets");
  const canManageModules = permissions.includes("Manage Project Modules");
  const canManageFiles = permissions.includes("Manage Project Files");
  const canViewReports = permissions.includes("View Project Reports");

  type VisibleTab =
    | "Overview"
    | "Tickets"
    | "Modules"
    | "Team"
    | "Files"
    | "Timeline"
    | "Reports"
    | "Settings";

  const visibleTabs: VisibleTab[] = ["Overview", "Tickets"];

  if (canManageModules) {
    visibleTabs.push("Modules");
  }

  visibleTabs.push("Team");

  if (canManageFiles) {
    visibleTabs.push("Files");
  }

  visibleTabs.push("Timeline");

  if (canViewReports) {
    visibleTabs.push("Reports");
  }

  visibleTabs.push("Settings");

  return (
    <ProjectDetailsView
      project={project}
      tickets={tickets}
      users={users}
      showSavedToast={saved === "1"}
      initialTab={tab}
      mode="resource"
      projectBaseHref="/resource-portal/projects"
      ticketBaseHref="/resource-portal/tickets"
      resourceBaseHref="/resource-portal/resources"
      allowProjectEdit={canEditProjects}
      allowProjectCreate={canCreateProjects}
      allowTicketCreate={canCreateTickets}
      visibleTabs={visibleTabs}
    />
  );
}

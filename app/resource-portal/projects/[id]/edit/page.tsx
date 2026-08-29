import { notFound } from "next/navigation";

import NewProjectForm from "@/components/features/NewProjectForm";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions, findProject, listClients, listUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourceEditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("Edit Projects")) {
    notFound();
  }

  const { id } = await params;

  const [project, users, clients] = await Promise.all([
    findProject(id),
    listUsers(),
    listClients(),
  ]);

  if (!project) notFound();

  return (
    <NewProjectForm
      users={users}
      clients={clients}
      initialProject={project}
      projectBaseHref="/resource-portal/projects"
      projectDraftsHref="/resource-portal/projects/drafts"
      ticketNewHref="/resource-portal/tickets/new"
      allowTeamAssignment={permissions.includes("Assign Project Team")}
      allowProjectModules={permissions.includes("Manage Project Modules")}
      allowProjectFiles={permissions.includes("Manage Project Files")}
    />
  );
}

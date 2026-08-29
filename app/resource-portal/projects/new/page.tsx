import { notFound } from "next/navigation";

import NewProjectForm from "@/components/features/NewProjectForm";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions, listClients, listUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourceNewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("Create Projects")) {
    notFound();
  }

  const { returnTo } = await searchParams;
  const [users, clients] = await Promise.all([listUsers(), listClients()]);

  return (
    <NewProjectForm
      users={users}
      clients={clients}
      returnTo={returnTo}
      projectBaseHref="/resource-portal/projects"
      projectDraftsHref="/resource-portal/projects/drafts"
      ticketNewHref="/resource-portal/tickets/new"
      allowTeamAssignment={permissions.includes("Assign Project Team")}
      allowProjectModules={permissions.includes("Manage Project Modules")}
      allowProjectFiles={permissions.includes("Manage Project Files")}
    />
  );
}

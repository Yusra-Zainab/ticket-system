import { notFound } from "next/navigation";

import NewClientForm from "@/components/features/NewClientForm";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions, listProjects, listUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourcePortalNewClientPage() {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("Create Clients")) {
    notFound();
  }

  const [users, projects] = await Promise.all([
    listUsers(),
    listProjects("OPEN"),
  ]);

  return (
    <NewClientForm
      users={users}
      projects={projects}
      clientBaseHref="/resource-portal/clients"
      projectBaseHref="/resource-portal/projects"
    />
  );
}

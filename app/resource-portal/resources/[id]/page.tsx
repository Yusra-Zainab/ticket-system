import { notFound } from "next/navigation";

import ResourceDetailsView from "@/components/features/ResourceDetailsView";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions, findResource, listProjects, listTickets } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourcePortalResourceDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("View Resources")) {
    notFound();
  }

  const { id } = await params;
  const { tab } = await searchParams;

  const canEditResource = permissions.includes("Edit Resources");
  const canAssignResource = permissions.includes("Assign Resources");

  const [resource, projects, tickets] = await Promise.all([
    findResource(id),
    listProjects("OPEN"),
    listTickets("OPEN"),
  ]);

  if (!resource || resource.lifecycle !== "OPEN") {
    notFound();
  }

  return (
    <ResourceDetailsView
      resource={resource}
      projects={projects}
      tickets={tickets}
      initialTab={tab}
      allowResourceEdit={canEditResource}
      allowResourceAssign={canAssignResource}
      resourceBaseHref="/resource-portal/resources"
      ticketBaseHref="/resource-portal/tickets"
    />
  );
}

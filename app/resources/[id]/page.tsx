import { notFound } from "next/navigation";

import ResourceDetailsView from "@/components/features/ResourceDetailsView";

import { findResource, listProjects, listTickets } from "@/lib/db";

export default async function ResourceDetailsPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

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
    />
  );
}

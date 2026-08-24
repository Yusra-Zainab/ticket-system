import { notFound } from "next/navigation";

import ResourceDetailsView from "@/components/features/ResourceDetailsView";

import { findResource, listProjects, listTickets } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourceDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

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
    />
  );
}

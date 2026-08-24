import { notFound } from "next/navigation";

import ProjectDetailsView from "@/components/features/ProjectDetailsView";
import { findProject, listTickets, listUsers } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProjectDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { saved, tab } = await searchParams;

  const [project, tickets, users] = await Promise.all([
    findProject(id),
    listTickets("OPEN"),
    listUsers(),
  ]);

  if (!project) notFound();

  return (
    <ProjectDetailsView
      project={project}
      tickets={tickets}
      users={users}
      showSavedToast={saved === "1"}
      initialTab={tab}
    />
  );
}

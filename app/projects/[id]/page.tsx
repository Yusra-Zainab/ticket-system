import { notFound } from "next/navigation";

import ProjectDetailsView from "@/components/features/ProjectDetailsView";
import { findProject, listTickets, listUsers } from "@/lib/db";

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
    />
  );
}

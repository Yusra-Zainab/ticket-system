import { notFound } from "next/navigation";

import NewProjectForm from "@/components/features/NewProjectForm";
import { findProject, listClients, listUsers } from "@/lib/db";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project, users, clients] = await Promise.all([
    findProject(id),
    listUsers(),
    listClients(),
  ]);

  if (!project) notFound();

  return <NewProjectForm users={users} clients={clients} initialProject={project} />;
}

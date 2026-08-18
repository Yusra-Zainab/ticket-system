import { notFound } from "next/navigation";

import EntityForm from "@/components/features/EntityForm";
import PageHeader from "@/components/ui/PageHeader";
import { findProject, listUsers } from "@/lib/db";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, users] = await Promise.all([findProject(id), listUsers()]);

  if (!project) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Edit Project" description={`Update ${project.name}`} />
      <EntityForm kind="project" users={users} />
    </div>
  );
}

import { Plus } from "lucide-react";

import ProjectsTable from "@/components/features/ProjectsTable";
import PageHeader from "@/components/ui/PageHeader";
import { listProjects } from "@/lib/db";

export default async function ProjectsPage() {
  const projects = await listProjects("OPEN");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects List"
        action="New Project"
        actionHref="/projects/new"
        actionIcon={Plus}
      />

      <ProjectsTable initialProjects={projects} />
    </div>
  );
}

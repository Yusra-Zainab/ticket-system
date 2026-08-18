import { Plus } from "lucide-react";
import Link from "next/link";

import ProjectsTable from "@/components/features/ProjectsTable";
import { listProjects } from "@/lib/db";
import PageHeader from "@/components/ui/PageHeader";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <div className="space-y-7">
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

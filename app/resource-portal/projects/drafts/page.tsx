import { Plus } from "lucide-react";
import { notFound } from "next/navigation";

import ProjectsDraftsTable from "@/components/features/ProjectsDraftsTable";
import PageHeader from "@/components/ui/PageHeader";
import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions, listProjects } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResourceProjectDraftsPage() {
  const user = await requireResourcePageSession();
  const permissions = await getRolePermissions(user.role);

  if (!permissions.includes("Create Projects")) {
    notFound();
  }

  const drafts = await listProjects("DRAFT");

  return (
    <div className="space-y-7">
      <PageHeader
        title="Project Drafts"
        action="New Project"
        actionHref="/resource-portal/projects/new"
        actionIcon={Plus}
      />

      <ProjectsDraftsTable
        initialProjects={drafts}
        projectHrefBase="/resource-portal/projects"
      />
    </div>
  );
}

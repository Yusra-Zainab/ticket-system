import { connection } from "next/server";

import ProjectsDraftsTable from "@/components/features/ProjectsDraftsTable";
import PageHeader from "@/components/ui/PageHeader";
import { listProjects } from "@/lib/db";
import type { Project } from "@/types";

export const dynamic = "force-dynamic";

export default async function ProjectDraftsPage() {
  await connection();

  let drafts: Project[] = [];

  try {
    drafts = await listProjects("DRAFT");
  } catch {
    drafts = [];
  }

  return (
    <div className="space-y-7">
      <PageHeader title="Project Drafts" />
      <ProjectsDraftsTable initialProjects={drafts} />
    </div>
  );
}

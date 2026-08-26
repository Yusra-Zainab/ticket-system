import { requireResourcePageSession } from "@/lib/auth";
import {
  findResourceTicket,
  listResourceProjects,
} from "@/lib/resourcePortal";
import ResourceTicketForm from "@/components/resource-portal/ResourceTicketForm";

export const dynamic = "force-dynamic";

export default async function NewResourceTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; projectId?: string }>;
}) {
  const user = await requireResourcePageSession();
  const selection = await searchParams;

  const [projects, foundDraft] = await Promise.all([
    listResourceProjects(user),
    selection.draft
      ? findResourceTicket(user, selection.draft)
      : Promise.resolve(undefined),
  ]);

  const draft = foundDraft?.lifecycle === "DRAFT" ? foundDraft : undefined;

  return (
    <div className="mx-auto max-w-7xl">
      <ResourceTicketForm
        projects={projects}
        initialTicket={draft}
        initialProjectId={selection.projectId || ""}
      />
    </div>
  );
}
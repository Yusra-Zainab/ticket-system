import TicketForm from "@/components/features/TicketForm";
import { requireResourcePageSession } from "@/lib/auth";
import { findResourceTicket, listResourceProjects } from "@/lib/resourcePortal";
import type { Project, Ticket } from "@/types";

export const dynamic = "force-dynamic";

export default async function NewResourceTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; projectId?: string; project?: string; module?: string; subModule?: string; url?: string }>;
}) {
  const user = await requireResourcePageSession();
  const selection = await searchParams;

  const [projects, foundDraft] = await Promise.all([
    listResourceProjects(user),
    selection.draft
      ? findResourceTicket(user, selection.draft)
      : Promise.resolve(undefined),
  ]);

  const draft = foundDraft?.lifecycle === "DRAFT" ? (foundDraft as unknown as Ticket) : undefined;

  return (
    <div className="mx-auto max-w-7xl">
      <TicketForm
        initialSelection={selection}
        initialTicket={draft}
        projects={projects as unknown as Project[]}
        ticketBaseHref="/resource-portal/tickets"
        ticketDraftsHref="/resource-portal/tickets/drafts"
        projectBaseHref="/resource-portal/projects"
        returnToHref="/resource-portal/tickets/new"
      />
    </div>
  );
}


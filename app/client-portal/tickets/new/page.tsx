import ClientTicketForm from "@/components/client-portal/ClientTicketForm";
import { requireClientPageSession } from "@/lib/auth";
import {
  findClientTicket,
  listClientProjects,
} from "@/lib/clientPortal";

export const dynamic = "force-dynamic";

export default async function NewClientTicketPage({
  searchParams,
}: {
  searchParams: Promise<{
    draft?: string;
    projectId?: string;
  }>;
}) {
  const user = await requireClientPageSession();
  const selection = await searchParams;

  const [projects, draft] = await Promise.all([
    listClientProjects(user),
    selection.draft
      ? findClientTicket(user, selection.draft)
      : Promise.resolve(undefined),
  ]);

  return (
    <div className="mx-auto max-w-7xl">
      <ClientTicketForm
        projects={projects}
        initialTicket={draft}
        initialProjectId={selection.projectId ?? ""}
      />
    </div>
  );
}

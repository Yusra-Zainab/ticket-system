import TicketForm from "@/components/features/TicketForm";
import { findTicket, listProjects, listUsers } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{
    project?: string;
    projectId?: string;
    module?: string;
    subModule?: string;
    url?: string;
    draft?: string;
  }>;
}) {
  const selection = await searchParams;
  let draft;
  if (selection.draft) {
    try {
      draft = await findTicket(selection.draft);
    } catch {
      draft = undefined;
    }
  }
  const [projects, users] = await Promise.all([listProjects(), listUsers()]);
  return (
    <div className="mx-auto max-w-7xl">
      <TicketForm
        initialSelection={selection}
        initialTicket={draft}
        projects={projects}
        users={users}
      />
    </div>
  );
}

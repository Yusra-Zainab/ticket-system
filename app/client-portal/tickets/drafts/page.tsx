import ClientTicketList from "@/components/client-portal/ClientTicketList";
import PageHeader from "@/components/ui/PageHeader";
import { requireClientPageSession } from "@/lib/auth";
import { listClientTickets } from "@/lib/clientPortal";

export const dynamic = "force-dynamic";

export default async function ClientTicketDraftsPage() {
  const user = await requireClientPageSession();
  const drafts = await listClientTickets(user, "DRAFT");

  return (
    <div className="space-y-7">
      <PageHeader title="Ticket Drafts" />
      <ClientTicketList tickets={drafts} drafts currentUserId={user.id} />
    </div>
  );
}

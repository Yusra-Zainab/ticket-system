import { Plus } from "lucide-react";

import ClientTicketList from "@/components/client-portal/ClientTicketList";
import PageHeader from "@/components/ui/PageHeader";
import { requireClientPageSession } from "@/lib/auth";
import { listClientTickets } from "@/lib/clientPortal";

export const dynamic = "force-dynamic";

export default async function ClientTicketsPage() {
  const user = await requireClientPageSession();
  const tickets = await listClientTickets(user, "OPEN");

  return (
    <div className="space-y-7">
      <PageHeader
        title="Tickets List"
        action="Create a New Ticket"
        actionHref="/client-portal/tickets/new"
        actionIcon={Plus}
      />

      <ClientTicketList tickets={tickets} />
    </div>
  );
}
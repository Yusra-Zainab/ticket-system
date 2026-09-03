import { Plus } from "lucide-react";
import { connection } from "next/server";

import TicketsTable from "@/components/features/TicketsTable";
import PageHeader from "@/components/ui/PageHeader";
import { requireAdminPageSession } from "@/lib/auth";
import { getRolePermissions, listTickets } from "@/lib/db";
import { getTicketListMeta } from "@/lib/ticketListMeta";
import { ticketRowFromTicket } from "@/lib/ticketRows";
import type { TicketListRow } from "@/types/ticketList";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const user = await requireAdminPageSession();
  await connection();

  let rows: TicketListRow[] = [];
  let canChangePriority = false;

  try {
    const [tickets, permissions] = await Promise.all([
      listTickets("OPEN"),
      getRolePermissions(user.role),
    ]);
    const meta = await getTicketListMeta(tickets.map((ticket) => ticket.id));

    canChangePriority = permissions.includes("Change Ticket Priority");
    rows = tickets.map((ticket) =>
      ticketRowFromTicket(ticket, meta.get(ticket.id)),
    );
  } catch (error) {
    console.error("Unable to load admin tickets:", error);
    rows = [];
  }

  return (
    <div className="space-y-7">
      <PageHeader
        title="Tickets List"
        action="Create a New Ticket"
        actionHref="/tickets/new"
        actionIcon={Plus}
      />

      <TicketsTable
        initialTickets={rows}
        currentUserId={String(user.id)}
        portal="admin"
        detailBaseHref="/tickets"
        canChangePriority={canChangePriority}
      />
    </div>
  );
}

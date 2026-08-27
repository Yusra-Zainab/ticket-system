import { Plus } from "lucide-react";
import { connection } from "next/server";

import TicketsTable from "@/components/features/TicketsTable";
import PageHeader from "@/components/ui/PageHeader";
import { requireAdminPageSession } from "@/lib/auth";
import { listTickets } from "@/lib/db";
import { getTicketListMeta } from "@/lib/ticketListMeta";
import type { TicketListRow } from "@/types/ticketList";

export const dynamic = "force-dynamic";

export default async function TicketsPage() {
  const user = await requireAdminPageSession();
  await connection();

  let rows: TicketListRow[] = [];

  try {
    const tickets = await listTickets("OPEN");
    const meta = await getTicketListMeta(tickets.map((ticket) => ticket.id));

    rows = tickets.map((ticket) => {
      const stored = meta.get(ticket.id);
      const formData = ticket.formData ?? {};

      return {
        id: ticket.id,
        title: ticket.title,
        type: String(formData.type ?? "Task"),
        priorityType: stored?.priorityType ?? "Not Assigned",
        priorityNumber: stored?.priorityNumber ?? ticket.priority,
        project: ticket.project,
        createdBy: ticket.reporter,
        createdById: stored?.createdById ?? String(ticket.createdById ?? ""),
        assignedTo: ticket.assignedTo || "Unassigned",
        createdAt: stored?.createdAt ?? ticket.created,
        updatedAt: stored?.updatedAt ?? ticket.updatedAt,
        dueDate: stored?.dueDate ?? ticket.dueDate,
        status: ticket.status,
        history: Array.isArray(formData.titleHistory)
          ? formData.titleHistory.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          : [],
      };
    });
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
        now={Date.now()}
      />
    </div>
  );
}

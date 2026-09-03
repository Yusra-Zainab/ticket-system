import { Plus } from "lucide-react";

import TicketsTable from "@/components/features/TicketsTable";
import PageHeader from "@/components/ui/PageHeader";

import { requireResourcePageSession } from "@/lib/auth";
import { getRolePermissions } from "@/lib/db";
import { listResourceTickets } from "@/lib/resourcePortal";

import { getTicketListMeta } from "@/lib/ticketListMeta";

import type { TicketListRow } from "@/types/ticketList";

export const dynamic = "force-dynamic";

export default async function ResourceTicketsPage() {
  const user = await requireResourcePageSession();
  const [tickets, permissions] = await Promise.all([
    listResourceTickets(user, "OPEN"),
    getRolePermissions(user.role),
  ]);

  const canViewTickets = permissions.includes("View Tickets");
  const canCreateTickets = permissions.includes("Create Tickets");
  const canChangePriority = permissions.includes("Change Ticket Priority");

  const meta = await getTicketListMeta(tickets.map((ticket) => ticket.id));

  const rows: TicketListRow[] = tickets.map((ticket) => {
    const stored = meta.get(ticket.id);

    return {
      id: ticket.id,
      title: ticket.title,
      type: ticket.type || "Task",
      priorityType: stored?.priorityType ?? ticket.priority,
      priorityNumber: stored?.priorityNumber ?? 1,
      project: ticket.project,
      createdBy: ticket.reporter,
      createdById: stored?.createdById ?? "",
      assignedTo: ticket.assignee || "Unassigned",
      createdAt: stored?.createdAt ?? ticket.createdAt,
      updatedAt: stored?.updatedAt ?? ticket.updatedAt,
      dueDate: stored?.dueDate ?? ticket.dueDate,
      status: ticket.status,
      history: Array.isArray(ticket.titleHistory)
        ? ticket.titleHistory.filter(
            (item): item is string => typeof item === "string" && item.trim().length > 0,
          )
        : [],
    };
  });

  return (
    <div className="space-y-7">
      <PageHeader
        title="Tickets List"
        action={canCreateTickets ? "Create a New Ticket" : undefined}
        actionHref={canCreateTickets ? "/resource-portal/tickets/new" : undefined}
        actionIcon={Plus}
      />

      {canViewTickets ? (
        <TicketsTable
          initialTickets={rows}
          currentUserId={String(user.id)}
          portal="resource"
          detailBaseHref="/resource-portal/tickets"
          canChangePriority={canChangePriority}
        />
      ) : null}
    </div>
  );
}




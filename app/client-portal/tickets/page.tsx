import {
  Plus,
} from "lucide-react";

import TicketsTable from "@/components/features/TicketsTable";
import PageHeader from "@/components/ui/PageHeader";

import {
  requireClientPageSession,
} from "@/lib/auth";

import {
  listClientTickets,
} from "@/lib/clientPortal";

import {
  getTicketListMeta,
} from "@/lib/ticketListMeta";

import type {
  TicketListRow,
} from "@/types/ticketList";

export const dynamic =
  "force-dynamic";

export default async function ClientTicketsPage() {
  const user =
    await requireClientPageSession();

  /*
   * Keep using listClientTickets().
   *
   * This preserves the existing
   * client/company/project scoping.
   */
  const tickets =
    await listClientTickets(
      user,
      "OPEN",
    );

  const meta =
    await getTicketListMeta(
      tickets.map(
        (ticket) =>
          ticket.id,
      ),
    );

  const rows:
    TicketListRow[] =
    tickets.map(
      (ticket) => {
        const stored =
          meta.get(
            ticket.id,
          );

        return {
          id:
            ticket.id,

          title:
            ticket.title,

          type:
            ticket.type ||
            "Task",

          priorityType:
            stored?.priorityType ??
            ticket.priority,

          priorityNumber:
            stored?.priorityNumber ??
            1,

          project:
            ticket.project,

          createdBy:
            ticket.reporter,

          /*
           * Server DB metadata is the
           * authority for rename permission.
           */
          createdById:
            stored?.createdById ??
            "",

          assignedTo:
            ticket.assignee ||
            "Unassigned",

          createdAt:
            stored?.createdAt ??
            ticket.createdAt,

          updatedAt:
            stored?.updatedAt ??
            ticket.updatedAt,

          dueDate:
            stored?.dueDate ??
            ticket.dueDate,

          status:
            ticket.status,

          history:
            ticket.titleHistory,
        };
      },
    );

  return (
    <div className="space-y-7 px-14 pb-8 pt-4">
      <PageHeader
        title="Tickets List"
        action="Create a New Ticket"
        actionHref="/client-portal/tickets/new"
        actionIcon={
          Plus
        }
      />

      <TicketsTable
        initialTickets={
          rows
        }
        currentUserId={String(
          user.id,
        )}
        portal="client"
        detailBaseHref="/client-portal/tickets"
        now={Date.now()}
      />
    </div>
  );
}
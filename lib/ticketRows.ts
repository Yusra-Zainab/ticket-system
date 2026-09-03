import type { Ticket } from "@/types";
import type { TicketListMeta } from "@/lib/ticketListMeta";
import type { TicketListRow } from "@/types/ticketList";

/**
 * Turn a `Ticket` (from `listTickets` / `listResourceTickets` / etc.) into the
 * `TicketListRow` shape `TicketsTable` expects. `meta` (from
 * `getTicketListMeta`) fills in the priority / created-by / date fields that
 * only live in `ticket_list_meta`; without it the ticket's own values are
 * used, which is enough for read-only embeds (e.g. the project detail
 * Tickets tab). Extracted from the per-page inline adapters so every ticket
 * list builds rows the same way.
 */
export function ticketRowFromTicket(
  ticket: Ticket,
  meta?: TicketListMeta,
): TicketListRow {
  const formData = (ticket.formData ?? {}) as Record<string, unknown>;

  const history = Array.isArray(formData.titleHistory)
    ? formData.titleHistory.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : [];

  return {
    id: ticket.id,
    title: ticket.title,
    type: String(formData.type ?? "Task"),
    priorityType: meta?.priorityType ?? "Not Assigned",
    priorityNumber: meta?.priorityNumber ?? ticket.priority ?? 1,
    project: ticket.project,
    createdBy: ticket.reporter,
    createdById: meta?.createdById ?? String(ticket.createdById ?? ""),
    assignedTo: ticket.assignedTo || "Unassigned",
    createdAt: meta?.createdAt ?? ticket.created,
    updatedAt: meta?.updatedAt ?? ticket.updatedAt,
    dueDate: meta?.dueDate ?? ticket.dueDate,
    status: ticket.status,
    history,
  };
}

import "server-only";

import type { RowDataPacket } from "mysql2/promise";

import { db } from "@/lib/db";

import { getTicketTitleHistories } from "@/lib/ticketTitleHistory";

import type { TicketPriorityType } from "@/types/ticketList";

type TicketMetaRow = RowDataPacket & {
  ticket_id: string;

  priority_type: string | null;

  priority_number: number | null;

  created_by: number | null;

  created_date: string | null;

  updated_at: string | null;

  deadline: string | null;
};

export type TicketListMeta = {
  priorityType: TicketPriorityType;

  priorityNumber: number;

  createdById: string;

  createdAt: string;

  updatedAt: string;

  dueDate: string;

  history: string[];
};

function normalizePriorityType(value: string | null): TicketPriorityType {
  switch (value) {
    case "Critical":
    case "High":
    case "Medium":
    case "Low":
    case "Not Assigned":
      return value;

    default:
      return "Not Assigned";
  }
}

export async function getTicketListMeta(ticketIds: string[]) {
  const result = new Map<string, TicketListMeta>();

  const ids = Array.from(
    new Set(ticketIds.map((id) => String(id).trim()).filter(Boolean)),
  );

  if (!ids.length) {
    return result;
  }

  const placeholders = ids.map(() => "?").join(",");

  /*
   * Load the actual creator ID.
   *
   * This is the authority used by the
   * frontend to decide whether to render
   * the title hover controls.
   */
  const [rows, histories] = await Promise.all([
    db
      .query<TicketMetaRow[]>(
        `
          SELECT
            ticket_id,
            priority_type,
            priority_number,
            created_by,
            created_date,
            updated_at,
            deadline

          FROM tickets

          WHERE ticket_id IN (
            ${placeholders}
          )
        `,
        ids,
      )
      .then(([rows]) => rows),

    getTicketTitleHistories(ids),
  ]);

  for (const row of rows) {
    const ticketId = String(row.ticket_id);

    result.set(ticketId, {
      priorityType: normalizePriorityType(row.priority_type),

      priorityNumber: Math.max(1, Number(row.priority_number ?? 1)),

      createdById: row.created_by == null ? "" : String(row.created_by),

      createdAt: row.created_date ?? "",

      updatedAt: row.updated_at ?? row.created_date ?? "",

      dueDate: row.deadline ?? "",

      history: histories.get(ticketId) ?? [],
    });
  }

  return result;
}

import "server-only";

import type {
  RowDataPacket,
} from "mysql2/promise";

import {
  db,
} from "@/lib/db";

declare global {
  var __ticketTitleHistoryInit:
    | Promise<void>
    | undefined;
}

/* =========================================================
   TABLE INITIALIZATION
   ========================================================= */

export async function ensureTicketTitleHistoryTable() {
  if (
    !globalThis.__ticketTitleHistoryInit
  ) {
    globalThis.__ticketTitleHistoryInit =
      (async () => {
        await db.execute(`
          CREATE TABLE IF NOT EXISTS ticket_title_history (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

            ticket_id VARCHAR(64) NOT NULL,

            previous_title VARCHAR(255) NOT NULL,

            changed_title VARCHAR(255) NOT NULL,

            changed_by BIGINT UNSIGNED NOT NULL,

            changed_at TIMESTAMP NOT NULL
              DEFAULT CURRENT_TIMESTAMP,

            undone_at TIMESTAMP NULL
              DEFAULT NULL,

            PRIMARY KEY (id),

            KEY idx_ticket_title_history_ticket (
              ticket_id,
              id
            ),

            KEY idx_ticket_title_history_active (
              ticket_id,
              undone_at
            )
          )
        `);
      })().catch(
        (error) => {
          globalThis.__ticketTitleHistoryInit =
            undefined;

          throw error;
        },
      );
  }

  await globalThis.__ticketTitleHistoryInit;
}

/* =========================================================
   HISTORY ROW
   ========================================================= */

type HistoryRow =
  RowDataPacket & {
    ticket_id:
      string;

    previous_title:
      string;
  };

/* =========================================================
   LOAD HISTORIES
   ========================================================= */

export async function getTicketTitleHistories(
  ticketIds:
    string[],
) {
  await ensureTicketTitleHistoryTable();

  const ids =
    Array.from(
      new Set(
        ticketIds
          .map(
            (id) =>
              String(
                id,
              ).trim(),
          )
          .filter(
            Boolean,
          ),
      ),
    );

  const result =
    new Map<
      string,
      string[]
    >();

  if (
    ids.length ===
    0
  ) {
    return result;
  }

  const placeholders =
    ids
      .map(
        () => "?",
      )
      .join(",");

  const [rows] =
    await db.query<
      HistoryRow[]
    >(
      `
        SELECT
          ticket_id,
          previous_title

        FROM ticket_title_history

        WHERE
          ticket_id IN (
            ${placeholders}
          )

          AND undone_at IS NULL

        ORDER BY
          id DESC
      `,
      ids,
    );

  for (
    const row
    of rows
  ) {
    const ticketId =
      String(
        row.ticket_id,
      );

    const history =
      result.get(
        ticketId,
      ) ?? [];

    history.push(
      row.previous_title,
    );

    result.set(
      ticketId,
      history,
    );
  }

  return result;
}

/*
 * Support BOTH:
 *
 * import {
 *   getTicketTitleHistories
 * } from "@/lib/ticketTitleHistory";
 *
 * AND:
 *
 * import getTicketTitleHistories
 *   from "@/lib/ticketTitleHistory";
 */
export default getTicketTitleHistories;
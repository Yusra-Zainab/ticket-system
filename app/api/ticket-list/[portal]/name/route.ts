import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import { z } from "zod";

import {
  requireAdminPageSession,
  requireClientPageSession,
  requireResourcePageSession,
} from "@/lib/auth";

import { db } from "@/lib/db";

import { listClientTickets } from "@/lib/clientPortal";

import { listResourceTickets } from "@/lib/resourcePortal";

import {
  ensureTicketTitleHistoryTable,
  getTicketTitleHistories,
} from "@/lib/ticketTitleHistory";

const portalSchema = z.enum(["admin", "client", "resource"]);

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("rename"),

    ticketId: z.string().min(1).max(100),

    title: z.string().trim().min(1).max(200),
  }),

  z.object({
    action: z.literal("undo"),

    ticketId: z.string().min(1).max(100),
  }),
]);

type Portal = z.infer<typeof portalSchema>;

type TicketOwnerRow = RowDataPacket & {
  ticket_id: string;

  title: string;

  created_by: number | null;
};

type RenameHistoryRow = RowDataPacket & {
  id: number;

  previous_title: string;
};

type Scope = {
  userId: string;

  allowedTicketIds: Set<string> | null;
};

async function getScope(portal: Portal): Promise<Scope> {
  if (portal === "admin") {
    const user = await requireAdminPageSession();

    return {
      userId: String(user.id),

      allowedTicketIds: null,
    };
  }

  if (portal === "client") {
    const user = await requireClientPageSession();

    const tickets = await listClientTickets(user, "OPEN");

    return {
      userId: String(user.id),

      allowedTicketIds: new Set(tickets.map((ticket) => String(ticket.id))),
    };
  }

  const user = await requireResourcePageSession();

  const tickets = await listResourceTickets(user, "OPEN");

  return {
    userId: String(user.id),

    allowedTicketIds: new Set(tickets.map((ticket) => String(ticket.id))),
  };
}

async function duplicateTitleExists(
  connection: PoolConnection,

  ticketId: string,

  title: string,
) {
  const [rows] = await connection.query<
    Array<
      RowDataPacket & {
        ticket_id: string;
      }
    >
  >(
    `
        SELECT
          ticket_id

        FROM tickets

        WHERE
          lifecycle = 'OPEN'

          AND ticket_id <> ?

          AND LOWER(title) =
              LOWER(?)

        LIMIT 1
      `,
    [ticketId, title],
  );

  return Boolean(rows[0]);
}

export async function PATCH(
  request: Request,

  context: {
    params: Promise<{
      portal: string;
    }>;
  },
) {
  let connection: PoolConnection | undefined;

  let transactionStarted = false;

  try {
    const { portal: rawPortal } = await context.params;

    const portal = portalSchema.parse(rawPortal);

    const body = requestSchema.parse(await request.json());

    const scope = await getScope(portal);

    /*
     * Client/resource users can modify
     * only tickets already visible to
     * that portal.
     */
    if (scope.allowedTicketIds && !scope.allowedTicketIds.has(body.ticketId)) {
      return Response.json(
        {
          error: "You do not have access to this ticket.",
        },
        {
          status: 403,
        },
      );
    }

    await ensureTicketTitleHistoryTable();

    connection = await db.getConnection();

    await connection.beginTransaction();

    transactionStarted = true;

    const [ticketRows] = await connection.query<TicketOwnerRow[]>(
      `
          SELECT
            ticket_id,
            title,
            created_by

          FROM tickets

          WHERE
            ticket_id = ?

            AND lifecycle = 'OPEN'

          LIMIT 1

          FOR UPDATE
        `,
      [body.ticketId],
    );

    const ticket = ticketRows[0];

    if (!ticket) {
      await connection.rollback();

      transactionStarted = false;

      return Response.json(
        {
          error: "Ticket not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * CRITICAL SECURITY CHECK.
     *
     * Admin status does not grant
     * another user's rename hover.
     *
     * Client status does not grant it.
     *
     * Resource status does not grant it.
     *
     * Only:
     *
     * tickets.created_by === logged in ID
     */
    if (String(ticket.created_by ?? "") !== scope.userId) {
      await connection.rollback();

      transactionStarted = false;

      return Response.json(
        {
          error: "Only the person who created this ticket can rename it.",
        },
        {
          status: 403,
        },
      );
    }

    /* =====================================================
       RENAME
       ===================================================== */

    if (body.action === "rename") {
      const nextTitle = body.title.trim();

      if (nextTitle.toLowerCase() === ticket.title.trim().toLowerCase()) {
        await connection.rollback();

        transactionStarted = false;

        return Response.json(
          {
            error: "The new ticket title is the same as the current title.",
          },
          {
            status: 400,
          },
        );
      }

      if (await duplicateTitleExists(connection, body.ticketId, nextTitle)) {
        await connection.rollback();

        transactionStarted = false;

        return Response.json(
          {
            error: "Ticket with the same title exists.",
          },
          {
            status: 409,
          },
        );
      }

      await connection.execute(
        `
          INSERT INTO ticket_title_history (
            ticket_id,
            previous_title,
            changed_title,
            changed_by
          )

          VALUES (
            ?, ?, ?, ?
          )
        `,
        [body.ticketId, ticket.title, nextTitle, Number(scope.userId)],
      );

      await connection.execute(
        `
          UPDATE tickets

          SET
            title = ?,
            updated_at =
              CURRENT_TIMESTAMP

          WHERE ticket_id = ?
        `,
        [nextTitle, body.ticketId],
      );

      await connection.commit();

      transactionStarted = false;

      const histories = await getTicketTitleHistories([body.ticketId]);

      return Response.json({
        ok: true,

        title: nextTitle,

        history: histories.get(body.ticketId) ?? [],
      });
    }

    /* =====================================================
       UNDO LAST RENAME
       ===================================================== */

    const [historyRows] = await connection.query<RenameHistoryRow[]>(
      `
          SELECT
            id,
            previous_title

          FROM ticket_title_history

          WHERE
            ticket_id = ?

            AND undone_at IS NULL

          ORDER BY
            id DESC

          LIMIT 1

          FOR UPDATE
        `,
      [body.ticketId],
    );

    const lastRename = historyRows[0];

    if (!lastRename) {
      await connection.rollback();

      transactionStarted = false;

      return Response.json(
        {
          error: "There is no previous ticket name to restore.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      await duplicateTitleExists(
        connection,
        body.ticketId,
        lastRename.previous_title,
      )
    ) {
      await connection.rollback();

      transactionStarted = false;

      return Response.json(
        {
          error:
            "The previous ticket name is now being used by another ticket.",
        },
        {
          status: 409,
        },
      );
    }

    await connection.execute(
      `
        UPDATE tickets

        SET
          title = ?,
          updated_at =
            CURRENT_TIMESTAMP

        WHERE ticket_id = ?
      `,
      [lastRename.previous_title, body.ticketId],
    );

    /*
     * Mark that rename as undone.
     *
     * This reproduces the old:
     *
     * history.slice(1)
     *
     * behavior while keeping an audit
     * record in the database.
     */
    await connection.execute(
      `
        UPDATE ticket_title_history

        SET
          undone_at =
            CURRENT_TIMESTAMP

        WHERE id = ?
      `,
      [lastRename.id],
    );

    await connection.commit();

    transactionStarted = false;

    const histories = await getTicketTitleHistories([body.ticketId]);

    return Response.json({
      ok: true,

      title: lastRename.previous_title,

      history: histories.get(body.ticketId) ?? [],
    });
  } catch (error) {
    if (transactionStarted && connection) {
      try {
        await connection.rollback();
      } catch {
        // nothing else to do
      }
    }

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Invalid ticket rename request.",

          details: error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    console.error("Ticket name update failed:", error);

    return Response.json(
      {
        error: "Unable to update the ticket name.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection?.release();
  }
}

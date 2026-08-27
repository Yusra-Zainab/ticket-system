import { randomUUID } from "node:crypto";

import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { z } from "zod";

import {
  requireAdminPageSession,
  requireClientPageSession,
  requireResourcePageSession,
} from "@/lib/auth";
import { findClientTicket } from "@/lib/clientPortal";
import { db } from "@/lib/db";
import { findResourceTicket } from "@/lib/resourcePortal";

const portalSchema = z.enum(["admin", "client", "resource"]);
const bodySchema = z.object({
  text: z.string().trim().min(1).max(10_000),
  attachments: z.array(z.string().max(255)).max(20).default([]),
});

type TicketRow = RowDataPacket & {
  id: number;
  form_data: string | Record<string, unknown> | null;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseFormData(value: TicketRow["form_data"]) {
  if (!value) return {};
  if (typeof value === "object") return record(value);

  try {
    return record(JSON.parse(value));
  } catch {
    return {};
  }
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function avatarOf(user: unknown) {
  const row = record(user);
  return typeof row.avatar === "string" ? row.avatar : null;
}

async function hasDatabaseColumn(
  connection: PoolConnection,
  table: string,
  column: string,
) {
  const [rows] = await connection.query<Array<RowDataPacket & { count: number }>>(
    `
      SELECT COUNT(*) AS count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
    `,
    [table, column],
  );

  return Number(rows[0]?.count ?? 0) > 0;
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      portal: string;
      ticketId: string;
    }>;
  },
) {
  let connection: PoolConnection | undefined;

  try {
    const { portal: rawPortal, ticketId } = await context.params;
    const portal = portalSchema.parse(rawPortal);
    const values = bodySchema.parse(await request.json());

    let user: { id: number; name: string; avatar?: string | null };

    if (portal === "client") {
      const clientUser = await requireClientPageSession();
      const allowed = await findClientTicket(clientUser, ticketId);
      if (!allowed) {
        return Response.json({ error: "Ticket not found." }, { status: 404 });
      }
      user = clientUser;
    } else if (portal === "resource") {
      const resourceUser = await requireResourcePageSession();
      const allowed = await findResourceTicket(resourceUser, ticketId);
      if (!allowed) {
        return Response.json({ error: "Ticket not found." }, { status: 404 });
      }
      user = resourceUser;
    } else {
      user = await requireAdminPageSession();
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query<TicketRow[]>(
      `
        SELECT id, form_data
        FROM tickets
        WHERE ticket_id = ?
          AND lifecycle = 'OPEN'
        LIMIT 1
        FOR UPDATE
      `,
      [ticketId],
    );

    const row = rows[0];
    if (!row) {
      await connection.rollback();
      return Response.json({ error: "Ticket not found." }, { status: 404 });
    }

    const formData = parseFormData(row.form_data);
    const currentComments = Array.isArray(formData.comments)
      ? formData.comments
      : [];
    const now = new Date().toISOString();

    const comment = {
      id: randomUUID(),
      userId: String(user.id),
      user: user.name,
      avatar: avatarOf(user),
      createdAt: now,
      time: now,
      content: values.text,
      text: values.text,
      attachments: values.attachments,
    };

    const activity = [
      `Comment added by ${user.name}`,
      ...stringArray(formData.activity),
    ].slice(0, 50);

    const nextFormData = {
      ...formData,
      comments: [...currentComments, comment].slice(-100),
      activity,
    };

    const hasVisibility = await hasDatabaseColumn(connection, "comments", "visibility");

    await connection.execute(
      hasVisibility
        ? "INSERT INTO comments (ticket_id, user_id, content, visibility) VALUES (?, ?, ?, 'PUBLIC')"
        : "INSERT INTO comments (ticket_id, user_id, content) VALUES (?, ?, ?)",
      [row.id, user.id, values.text],
    );

    await connection.execute(
      `
        UPDATE tickets
        SET form_data = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE ticket_id = ?
          AND lifecycle = 'OPEN'
      `,
      [JSON.stringify(nextFormData), ticketId],
    );

    await connection.commit();

    return Response.json({ ok: true, comment });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // Transaction may already be complete.
      }
    }

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid comment.", details: error.flatten() },
        { status: 400 },
      );
    }

    console.error("Unable to save ticket comment:", error);
    return Response.json({ error: "Unable to save comment." }, { status: 500 });
  } finally {
    connection?.release();
  }
}

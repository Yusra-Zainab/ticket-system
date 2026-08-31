import { randomUUID } from "node:crypto";

import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { z } from "zod";

import {
  getSessionUser,
  isAdminRole,
  isClientRole,
  isResourceRole,
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

    /*
     * Auth first — before body parsing or opening a transaction. Uses the
     * API-appropriate session check: the page-session helpers `redirect()`
     * on failure, and inside a route handler that redirect throw was being
     * swallowed by the catch below into a generic 500 instead of a 401/403
     * (F24).
     */
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return Response.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }
    const portalRoleOk =
      portal === "client"
        ? isClientRole(sessionUser.role)
        : portal === "resource"
          ? isResourceRole(sessionUser.role)
          : isAdminRole(sessionUser.role);
    if (!portalRoleOk) {
      return Response.json(
        { error: "You can't comment through this portal." },
        { status: 403 },
      );
    }

    const values = bodySchema.parse(await request.json());

    let user: { id: number; name: string; avatar?: string | null };

    if (portal === "client") {
      const allowed = await findClientTicket(sessionUser, ticketId);
      if (!allowed) {
        return Response.json({ error: "Ticket not found." }, { status: 404 });
      }
      user = sessionUser;
    } else if (portal === "resource") {
      const allowed = await findResourceTicket(sessionUser, ticketId);
      if (!allowed) {
        return Response.json({ error: "Ticket not found." }, { status: 404 });
      }
      user = sessionUser;
    } else {
      user = sessionUser;
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

    await connection.execute(
      "INSERT INTO comments (ticket_id, user_id, content) VALUES (?, ?, ?)",
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

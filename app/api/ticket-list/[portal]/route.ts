import type { PoolConnection } from "mysql2/promise";

import { z } from "zod";

import {
  getSessionUser,
  isAdminRole,
  isClientRole,
  isResourceRole,
} from "@/lib/auth";

import { db } from "@/lib/db";

import { listClientTickets } from "@/lib/clientPortal";

import { listResourceTickets } from "@/lib/resourcePortal";

/* =========================================================
   VALIDATION
   ========================================================= */

const portalSchema = z.enum(["admin", "client", "resource"]);

const priorityTypeSchema = z.enum([
  "Critical",
  "High",
  "Medium",
  "Low",
  "Not Assigned",
]);

const updateSchema = z
  .object({
    id: z.string().min(1).max(100),

    status: z.string().trim().min(1).max(80).optional(),

    priorityType: priorityTypeSchema.optional(),

    priorityNumber: z.number().int().min(1).max(999).optional(),
  })
  .refine(
    (value) =>
      value.status !== undefined ||
      value.priorityType !== undefined ||
      value.priorityNumber !== undefined,
    {
      message: "No ticket changes supplied.",
    },
  );

const bodySchema = z.object({
  updates: z.array(updateSchema).min(1).max(500),
});

type Portal = z.infer<typeof portalSchema>;

type Scope = {
  userId: number;

  allowedIds: Set<string> | null;
};

/* =========================================================
   PORTAL SCOPE
   ========================================================= */

async function getScope(portal: Portal): Promise<Scope | null> {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  if (portal === "admin") {
    if (!isAdminRole(user.role)) {
      return null;
    }

    return {
      userId: user.id,

      allowedIds: null,
    };
  }

  if (portal === "client") {
    if (!isClientRole(user.role)) {
      return null;
    }

    const tickets = await listClientTickets(user, "OPEN");

    return {
      userId: user.id,

      allowedIds: new Set(tickets.map((ticket) => String(ticket.id))),
    };
  }

  if (!isResourceRole(user.role)) {
    return null;
  }

  const tickets = await listResourceTickets(user, "OPEN");

  return {
    userId: user.id,

    allowedIds: new Set(tickets.map((ticket) => String(ticket.id))),
  };
}

function scopeAllows(
  scope: Scope,

  ids: string[],
) {
  if (scope.allowedIds === null) {
    return true;
  }

  return ids.every((id) => scope.allowedIds!.has(id));
}

/* =========================================================
   PATCH
   ========================================================= */

export async function PATCH(
  request: Request,

  context: {
    params: Promise<{
      portal: string;
    }>;
  },
) {
  let connection: PoolConnection | undefined;

  try {
    const { portal: rawPortal } = await context.params;

    const portal = portalSchema.parse(rawPortal);

    const scope = await getScope(portal);

    if (!scope) {
      return Response.json(
        {
          error: "Authentication required.",
        },
        {
          status: 401,
        },
      );
    }

    const { updates } = bodySchema.parse(await request.json());

    const ids = Array.from(new Set(updates.map((update) => update.id)));

    if (!scopeAllows(scope, ids)) {
      return Response.json(
        {
          error: "You do not have access to one or more selected tickets.",
        },
        {
          status: 403,
        },
      );
    }

    connection = await db.getConnection();

    await connection.beginTransaction();

    for (const update of updates) {
      const fields: string[] = [];

      const values: Array<string | number> = [];

      if (update.status !== undefined) {
        fields.push("status = ?");

        values.push(update.status);
      }

      if (update.priorityType !== undefined) {
        fields.push("priority_type = ?");

        values.push(update.priorityType);
      }

      if (update.priorityNumber !== undefined) {
        fields.push("priority_number = ?");

        values.push(update.priorityNumber);
      }

      fields.push("updated_at = CURRENT_TIMESTAMP");

      values.push(update.id);

      await connection.execute(
        `
          UPDATE tickets

          SET
            ${fields.join(", ")}

          WHERE
            ticket_id = ?

            AND lifecycle = 'OPEN'
        `,
        values,
      );
    }

    await connection.commit();

    return Response.json({
      ok: true,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // No active transaction.
      }
    }

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Invalid ticket update.",

          details: error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    console.error("Ticket list update failed:", error);

    return Response.json(
      {
        error: "Unable to update tickets.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection?.release();
  }
}

/* =========================================================
   DELETE

   Uses the same Client / Resource scope as the list itself.
   ========================================================= */

export async function DELETE(
  request: Request,

  context: {
    params: Promise<{
      portal: string;
    }>;
  },
) {
  try {
    const { portal: rawPortal } = await context.params;

    const portal = portalSchema.parse(rawPortal);

    const scope = await getScope(portal);

    if (!scope) {
      return Response.json(
        {
          error: "Authentication required.",
        },
        {
          status: 401,
        },
      );
    }

    const url = new URL(request.url);

    const id = (url.searchParams.get("id") ?? "").trim();

    if (!id) {
      return Response.json(
        {
          error: "Ticket id is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!scopeAllows(scope, [id])) {
      return Response.json(
        {
          error: "You do not have access to this ticket.",
        },
        {
          status: 403,
        },
      );
    }

    const [result] = await db.execute(
      `
          DELETE FROM tickets

          WHERE
            ticket_id = ?

            AND lifecycle = 'OPEN'
        `,
      [id],
    );

    const affectedRows =
      "affectedRows" in result ? Number(result.affectedRows) : 0;

    if (affectedRows === 0) {
      return Response.json(
        {
          error: "Ticket not found.",
        },
        {
          status: 404,
        },
      );
    }

    return Response.json({
      ok: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Invalid request.",
        },
        {
          status: 400,
        },
      );
    }

    console.error("Ticket delete failed:", error);

    return Response.json(
      {
        error: "Unable to delete ticket.",
      },
      {
        status: 500,
      },
    );
  }
}

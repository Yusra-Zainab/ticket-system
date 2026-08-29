import { randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { z } from "zod";

import { requireApiPermission } from "@/lib/apiPermissions";

import { db, findClientRecord } from "@/lib/db";

const updateSchema = z.object({
  lifecycle: z.enum(["DRAFT", "OPEN"]),

  formData: z.record(z.string(), z.unknown()),
});

type ExistingClientRow = RowDataPacket & {
  email: string;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function clientDbStatus(value: unknown): "active" | "inactive" {
  return stringValue(value).toLowerCase() === "inactive"
    ? "inactive"
    : "active";
}

function projectIdsFromForm(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const auth = await requireApiPermission("View Clients");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;

  const client = await findClientRecord(id);

  if (!client) {
    return Response.json(
      {
        error: "Client not found.",
      },
      {
        status: 404,
      },
    );
  }

  return Response.json(client);
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const auth = await requireApiPermission("Edit Clients");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;

  const clientId = Number(id);

  if (!Number.isInteger(clientId) || clientId <= 0) {
    return Response.json(
      {
        error: "Invalid client id.",
      },
      {
        status: 400,
      },
    );
  }

  const connection = await db.getConnection();

  try {
    const value = updateSchema.parse(await request.json());

    const form = value.formData;

    if (Array.isArray(form.projectIds)) {
      const assignAuth = await requireApiPermission("Assign Client Projects");

      if ("response" in assignAuth) {
        return assignAuth.response;
      }
    }

    if (
      form.accountManagerId !== undefined ||
      form.coordinatorId !== undefined
    ) {
      const teamAuth = await requireApiPermission("Manage Client Team");

      if ("response" in teamAuth) {
        return teamAuth.response;
      }
    }

    const clientName =
      stringValue(form.clientName) ||
      stringValue(form.primaryContactName) ||
      "Untitled Client";

    const primaryContact = stringValue(form.primaryContactName) || clientName;

    const primaryEmail = stringValue(form.primaryEmail);

    if (
      value.lifecycle === "OPEN" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryEmail)
    ) {
      return Response.json(
        {
          error: "Enter a valid primary contact email.",
        },
        {
          status: 400,
        },
      );
    }

    const [existingRows] = await connection.query<ExistingClientRow[]>(
      `
          SELECT
            email

          FROM clients

          WHERE
            id = ?

          LIMIT 1
        `,
      [clientId],
    );

    const existing = existingRows[0];

    if (!existing) {
      return Response.json(
        {
          error: "Client not found.",
        },
        {
          status: 404,
        },
      );
    }

    const email =
      primaryEmail ||
      (existing.email.endsWith("@draft.local")
        ? existing.email
        : `draft-${randomUUID()}@draft.local`);

    const company =
      stringValue(form.clientType) === "Individual" ? null : clientName;

    await connection.beginTransaction();

    const [result] = await connection.execute<ResultSetHeader>(
      `
          UPDATE clients

          SET
            name = ?,
            email = ?,
            phone = ?,
            company = ?,
            status = ?,
            lifecycle = ?,
            form_data = ?,
            updated_at = CURRENT_TIMESTAMP

          WHERE
            id = ?
        `,
      [
        primaryContact,

        email,

        stringValue(form.primaryPhone) || null,

        company,

        clientDbStatus(form.clientStatus),

        value.lifecycle,

        JSON.stringify(form),

        clientId,
      ],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();

      return Response.json(
        {
          error: "Client not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Only modify actual project/client
     * relationships when the client is
     * registered/open.
     */
    if (value.lifecycle === "OPEN") {
      const projectIds = projectIdsFromForm(form.projectIds);

      /*
       * Remove this client from projects
       * that are no longer selected.
       */
      if (projectIds.length > 0) {
        const placeholders = projectIds.map(() => "?").join(",");

        await connection.execute(
          `
            UPDATE projects

            SET
              client_id = NULL

            WHERE
              client_id = ?

              AND id NOT IN (
                ${placeholders}
              )
          `,
          [clientId, ...projectIds],
        );

        await connection.execute(
          `
            UPDATE projects

            SET
              client_id = ?

            WHERE
              id IN (
                ${placeholders}
              )
          `,
          [clientId, ...projectIds],
        );
      } else {
        /*
         * No assigned projects were
         * selected anymore.
         */
        await connection.execute(
          `
            UPDATE projects

            SET
              client_id = NULL

            WHERE
              client_id = ?
          `,
          [clientId],
        );
      }
    }

    await connection.commit();

    return Response.json({
      id: String(clientId),

      lifecycle: value.lifecycle,
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Nothing to rollback.
    }

    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Invalid client data.",

          details: error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    console.error("Unable to update client:", error);

    return Response.json(
      {
        error: "Unable to update client.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const auth = await requireApiPermission("Delete Clients");

  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;

  const clientId = Number(id);

  if (!Number.isInteger(clientId) || clientId <= 0) {
    return Response.json(
      {
        error: "Invalid client id.",
      },
      {
        status: 400,
      },
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    /*
     * Preserve projects and tickets.
     * Projects simply become unassigned.
     */
    await connection.execute(
      `
        UPDATE projects

        SET
          client_id = NULL

        WHERE
          client_id = ?
      `,
      [clientId],
    );

    const [result] = await connection.execute<ResultSetHeader>(
      `
          DELETE FROM clients

          WHERE
            id = ?
        `,
      [clientId],
    );

    if (result.affectedRows === 0) {
      await connection.rollback();

      return Response.json(
        {
          error: "Client not found.",
        },
        {
          status: 404,
        },
      );
    }

    await connection.commit();

    return Response.json({
      ok: true,

      id: String(clientId),
    });
  } catch (error) {
    await connection.rollback();

    console.error("Unable to delete client:", error);

    return Response.json(
      {
        error: "Unable to delete client.",
      },
      {
        status: 500,
      },
    );
  } finally {
    connection.release();
  }
}

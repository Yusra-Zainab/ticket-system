import {
  randomUUID,
} from "node:crypto";

import type {
  ResultSetHeader,
} from "mysql2/promise";

import {
  z,
} from "zod";

import {
  db,
  listClients,
} from "@/lib/db";

const schema =
  z.object({
    lifecycle:
      z.enum([
        "DRAFT",
        "OPEN",
      ]),

    formData:
      z.record(
        z.string(),
        z.unknown(),
      ),
  });

function stringValue(
  value: unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function clientDbStatus(
  value: unknown,
):
  | "active"
  | "inactive" {
  return stringValue(
    value,
  ).toLowerCase() ===
    "inactive"
    ? "inactive"
    : "active";
}

function projectIdsFromForm(
  value: unknown,
) {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        item,
      ) =>
        Number(
          item,
        ),
    )
    .filter(
      (
        item,
      ) =>
        Number.isInteger(
          item,
        ) &&
        item >
          0,
    );
}

export async function GET() {
  try {
    return Response.json(
      await listClients(),
    );
  } catch (
    error
  ) {
    console.error(
      error,
    );

    return Response.json(
      {
        error:
          "Unable to load clients.",
      },
      {
        status:
          503,
      },
    );
  }
}

export async function POST(
  request: Request,
) {
  const connection =
    await db.getConnection();

  try {
    const value =
      schema.parse(
        await request.json(),
      );

    const form =
      value.formData;

    const clientName =
      stringValue(
        form.clientName,
      ) ||
      stringValue(
        form.primaryContactName,
      ) ||
      "Untitled Client";

    const primaryContact =
      stringValue(
        form.primaryContactName,
      ) ||
      clientName;

    const primaryEmail =
      stringValue(
        form.primaryEmail,
      );

    if (
      value.lifecycle ===
        "OPEN" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        primaryEmail,
      )
    ) {
      return Response.json(
        {
          error:
            "Enter a valid primary contact email.",
        },
        {
          status:
            400,
        },
      );
    }

    const email =
      primaryEmail ||
      `draft-${randomUUID()}@draft.local`;

    const clientType =
      stringValue(
        form.clientType,
      );

    const company =
      clientType ===
      "Individual"
        ? null
        : clientName;

    await connection.beginTransaction();

    const [result] =
      await connection.execute<ResultSetHeader>(
        `
          INSERT INTO clients (
            name,
            email,
            phone,
            company,
            status,
            lifecycle,
            form_data
          )

          VALUES (
            ?, ?, ?, ?, ?, ?, ?
          )
        `,
        [
          primaryContact,

          email,

          stringValue(
            form.primaryPhone,
          ) ||
            null,

          company,

          clientDbStatus(
            form.clientStatus,
          ),

          value.lifecycle,

          JSON.stringify(
            form,
          ),
        ],
      );

    const clientId =
      result.insertId;

    /*
     * Drafts only store project IDs
     * inside form_data.
     *
     * Actual project assignment happens
     * when registering the client.
     */
    if (
      value.lifecycle ===
      "OPEN"
    ) {
      const projectIds =
        projectIdsFromForm(
          form.projectIds,
        );

      if (
        projectIds.length >
        0
      ) {
        const placeholders =
          projectIds
            .map(
              () => "?",
            )
            .join(",");

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
          [
            clientId,
            ...projectIds,
          ],
        );
      }
    }

    await connection.commit();

    return Response.json(
      {
        id:
          String(
            clientId,
          ),

        lifecycle:
          value.lifecycle,
      },
      {
        status:
          201,
      },
    );
  } catch (
    error
  ) {
    try {
      await connection.rollback();
    } catch {
      // Nothing to rollback.
    }

    if (
      error instanceof
      z.ZodError
    ) {
      return Response.json(
        {
          error:
            "Invalid client data.",

          details:
            error.flatten(),
        },
        {
          status:
            400,
        },
      );
    }

    console.error(
      "Unable to create client:",
      error,
    );

    return Response.json(
      {
        error:
          "Unable to create client.",
      },
      {
        status:
          500,
      },
    );
  } finally {
    connection.release();
  }
}
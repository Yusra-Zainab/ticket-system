import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { z } from "zod";

import { requireApiPermission } from "@/lib/apiPermissions";
import { db } from "@/lib/db";

const schema = z.object({
  driver: z.enum(["", "SMTP", "Mailgun", "SendGrid", "Amazon SES"]),

  host: z.string().max(255),

  port: z.string().max(10),

  username: z.string().max(255),

  password: z.string().max(1000),

  encryption: z.enum(["", "TLS", "SSL", "None"]),

  fromAddress: z.string().max(255),

  mailgunSecret: z.string().max(1000),

  mailgunDomain: z.string().max(255),
});

type CurrentSettings = RowDataPacket & {
  password: string | null;

  mailgun_secret: string | null;
};

export async function PATCH(request: Request) {
  const auth = await requireApiPermission("Configure Email");

  if ("response" in auth) {
    return auth.response;
  }

  try {
    const values = schema.parse(await request.json());

    const port = values.port ? Number(values.port) : null;

    if (
      port !== null &&
      (!Number.isInteger(port) || port < 1 || port > 65535)
    ) {
      return Response.json(
        {
          error: "Invalid port number.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      values.fromAddress &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.fromAddress)
    ) {
      return Response.json(
        {
          error: "Invalid From Address.",
        },
        {
          status: 400,
        },
      );
    }

    const [currentRows] = await db.query<CurrentSettings[]>(
      `
          SELECT
            password,
            mailgun_secret

          FROM email_settings

          WHERE id = 1

          LIMIT 1
        `,
    );

    const current = currentRows[0];

    /*
     * Blank secret fields mean:
     * preserve the currently stored
     * secret.
     */
    const password = values.password || current?.password || null;

    const mailgunSecret =
      values.mailgunSecret || current?.mailgun_secret || null;

    await db.execute<ResultSetHeader>(
      `
        INSERT INTO email_settings (
          id,
          driver,
          host,
          port,
          username,
          password,
          encryption,
          from_address,
          mailgun_secret,
          mailgun_domain
        )

        VALUES (
          1,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?
        )

        ON DUPLICATE KEY UPDATE
          driver =
            VALUES(driver),

          host =
            VALUES(host),

          port =
            VALUES(port),

          username =
            VALUES(username),

          password =
            VALUES(password),

          encryption =
            VALUES(encryption),

          from_address =
            VALUES(from_address),

          mailgun_secret =
            VALUES(mailgun_secret),

          mailgun_domain =
            VALUES(mailgun_domain),

          updated_at =
            CURRENT_TIMESTAMP
      `,
      [
        values.driver || null,

        values.host || null,

        port,

        values.username || null,

        password,

        values.encryption || null,

        values.fromAddress || null,

        mailgunSecret,

        values.mailgunDomain || null,
      ],
    );

    return Response.json({
      ok: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Invalid email settings.",

          details: error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    console.error("Unable to update email settings:", error);

    return Response.json(
      {
        error: "Unable to update email settings.",
      },
      {
        status: 500,
      },
    );
  }
}

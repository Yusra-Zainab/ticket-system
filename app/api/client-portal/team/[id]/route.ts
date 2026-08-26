import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";

import {
  getSessionUser,
  isClientRole,
} from "@/lib/auth";
import {
  findClientTeamMember,
  getClientContext,
} from "@/lib/clientPortal";
import { db } from "@/lib/db";

const schema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).optional().default(""),
  email: z.string().email().max(255),
  phone: z.string().trim().max(80).optional().default(""),
  jobTitle: z.string().trim().max(120).optional().default(""),
  communicationChannel: z
    .string()
    .trim()
    .max(80)
    .optional()
    .default("Email"),
  avatar: z.string().optional().default(""),
});

async function clientUser() {
  const user = await getSessionUser();

  return user && isClientRole(user.role)
    ? user
    : null;
}

function parseObject(
  value: string | Record<string, unknown> | null | undefined,
) {
  if (!value) {
    return {} as Record<string, unknown>;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const user = await clientUser();

  if (!user) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { id } = await params;
  const member = await findClientTeamMember(user, id);

  if (!member) {
    return Response.json(
      { error: "Team member not found." },
      { status: 404 },
    );
  }

  return Response.json(member);
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const user = await clientUser();

    if (!user) {
      return Response.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const { id } = await params;
    const numericId = Number(id);

    if (!Number.isInteger(numericId) || numericId <= 0) {
      return Response.json(
        { error: "Invalid team member." },
        { status: 400 },
      );
    }

    const [member, context] = await Promise.all([
      findClientTeamMember(user, id),
      getClientContext(user),
    ]);

    if (!member || !context) {
      return Response.json(
        { error: "Team member not found." },
        { status: 404 },
      );
    }

    const values = schema.parse(await request.json());

    const [duplicate] = await db.query<
      Array<RowDataPacket & { id: number }>
    >(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER(?)
          AND id <> ?
        LIMIT 1
      `,
      [values.email, numericId],
    );

    if (duplicate[0]) {
      return Response.json(
        { error: "A user with this email already exists." },
        { status: 409 },
      );
    }

    const [rows] = await db.query<
      Array<
        RowDataPacket & {
          form_data:
            | string
            | Record<string, unknown>
            | null;
        }
      >
    >(
      `
        SELECT form_data
        FROM users
        WHERE id = ?
          AND LOWER(role) IN ('client', 'client_user')
        LIMIT 1
      `,
      [numericId],
    );

    const currentFormData = parseObject(
      rows[0]?.form_data,
    );

    const name = [
      values.firstName,
      values.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const nextFormData = {
      ...currentFormData,
      clientId: context.clientId,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      jobTitle: values.jobTitle,
      communicationChannel: values.communicationChannel,
      avatarUrl: values.avatar || "",
    };

    await db.execute(
      `
        UPDATE users
        SET
          name = ?,
          email = ?,
          avatar = ?,
          form_data = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        name,
        values.email,
        values.avatar || null,
        JSON.stringify(nextFormData),
        numericId,
      ],
    );

    /*
     * Keep clients.form_data.teamMembers in sync for Admin Client Details.
     */
    const [clientRows] = await db.query<
      Array<
        RowDataPacket & {
          form_data:
            | string
            | Record<string, unknown>
            | null;
        }
      >
    >(
      `
        SELECT form_data
        FROM clients
        WHERE id = ?
        LIMIT 1
      `,
      [context.clientId],
    );

    const storedClient = parseObject(
      clientRows[0]?.form_data,
    );

    const rawMembers = Array.isArray(
      storedClient.teamMembers,
    )
      ? storedClient.teamMembers
      : [];

    let replaced = false;

    const nextMembers = rawMembers.map((item) => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        return item;
      }

      const record =
        item as Record<string, unknown>;

      const sameId =
        String(record.id ?? "") === String(numericId);

      const sameEmail =
        String(record.email ?? "")
          .trim()
          .toLowerCase() ===
        member.email.trim().toLowerCase();

      if (!sameId && !sameEmail) {
        return item;
      }

      replaced = true;

      return {
        ...record,
        id: String(numericId),
        name,
        role:
          values.jobTitle ||
          String(record.role ?? "Client User"),
        email: values.email,
        phone: values.phone,
        contactChannel: values.communicationChannel,
        accessLevel: "Client Portal",
        avatar: values.avatar || "",
      };
    });

    if (!replaced) {
      nextMembers.push({
        id: String(numericId),
        name,
        role: values.jobTitle || "Client User",
        email: values.email,
        phone: values.phone,
        contactChannel: values.communicationChannel,
        accessLevel: "Client Portal",
        avatar: values.avatar || "",
      });
    }

    await db.execute(
      `
        UPDATE clients
        SET
          form_data = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        JSON.stringify({
          ...storedClient,
          teamMembers: nextMembers,
        }),
        context.clientId,
      ],
    );

    return Response.json({
      member: {
        id: String(numericId),
        firstName: values.firstName,
        lastName: values.lastName,
        name,
        email: values.email,
        phone: values.phone,
        jobTitle: values.jobTitle,
        communicationChannel:
          values.communicationChannel,
        avatar: values.avatar || null,
        status: member.status,
        addedAt: member.addedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Invalid team member information.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    console.error(error);

    return Response.json(
      { error: "Unable to update team member." },
      { status: 500 },
    );
  }
}

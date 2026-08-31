import { randomBytes } from "node:crypto";

import type {
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";
import { z } from "zod";

import {
  buildResetUrl,
  createPasswordResetToken,
  getSessionUser,
  hashPassword,
  isClientRole,
  sendMail,
} from "@/lib/auth";
import { AvatarError, persistUserAvatar } from "@/lib/avatars";
import { getClientContext, listClientTeam } from "@/lib/clientPortal";
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

export async function GET() {
  const user = await clientUser();

  if (!user) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  return Response.json(await listClientTeam(user));
}

export async function POST(request: Request) {
  try {
    const user = await clientUser();

    if (!user) {
      return Response.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const values = schema.parse(await request.json());
    const context = await getClientContext(user);

    if (!context) {
      return Response.json(
        { error: "This account is not linked to a client." },
        { status: 403 },
      );
    }

    const [existing] = await db.query<
      Array<RowDataPacket & { id: number }>
    >(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
      `,
      [values.email],
    );

    if (existing[0]) {
      return Response.json(
        { error: "A user with this email already exists." },
        { status: 409 },
      );
    }

    const name = [
      values.firstName,
      values.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const formData: Record<string, unknown> = {
      clientId: context.clientId,
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      jobTitle: values.jobTitle,
      communicationChannel: values.communicationChannel,
      avatarUrl: "",
      emailNotifications: true,
    };

    const temporaryPassword =
      randomBytes(24).toString("base64url");

    const [result] = await db.execute<ResultSetHeader>(
      `
        INSERT INTO users (
          name,
          email,
          password,
          role,
          avatar,
          lifecycle,
          form_data
        )
        VALUES (?, ?, ?, 'client', ?, 'OPEN', ?)
      `,
      [
        name,
        values.email,
        await hashPassword(temporaryPassword),
        null,
        JSON.stringify(formData),
      ],
    );

    const userId = Number(result.insertId ?? 0);

    const avatarUrl = await persistUserAvatar(userId, values.avatar);
    formData.avatarUrl = avatarUrl ?? "";
    await db.execute("UPDATE users SET avatar = ?, form_data = ? WHERE id = ?", [
      avatarUrl,
      JSON.stringify(formData),
      userId,
    ]);

    /*
     * Keep the Admin Client Details representation in sync.
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

    const stored = parseObject(
      clientRows[0]?.form_data,
    );

    const teamMembers = Array.isArray(stored.teamMembers)
      ? [...stored.teamMembers]
      : [];

    teamMembers.push({
      id: String(userId),
      name,
      role: values.jobTitle || "Client User",
      email: values.email,
      phone: values.phone,
      contactChannel: values.communicationChannel,
      accessLevel: "Client Portal",
      avatar: avatarUrl ?? "",
    });

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
          ...stored,
          teamMembers,
        }),
        context.clientId,
      ],
    );

    let inviteSent = false;

    try {
      const reset =
        await createPasswordResetToken(values.email);

      if (reset) {
        await sendMail({
          to: values.email,
          subject: "Your Support Portal account is ready",
          html: `
            <p>${name}, your client portal account has been created.</p>
            <p><a href="${buildResetUrl(
              request,
              reset.token,
            )}">Set your password</a></p>
            <p>This link expires in 1 hour. You can also use Forgot Password from the login page.</p>
          `,
        });

        inviteSent = true;
      }
    } catch (mailError) {
      console.error(
        "Client team invitation email failed",
        mailError,
      );
    }

    return Response.json(
      {
        member: {
          id: String(userId),
          name,
          email: values.email,
        },
        inviteSent,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AvatarError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
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
      { error: "Unable to add team member." },
      { status: 500 },
    );
  }
}
import { promisify } from "node:util";

import { randomBytes, scrypt } from "node:crypto";

import { z } from "zod";

import type { ResultSetHeader } from "mysql2/promise";

import { db, listUsers } from "@/lib/db";

const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString("hex");

  const derived = (await promisify(scrypt)(password, salt, 64)) as Buffer;

  return `${salt}:${derived.toString("hex")}`;
};

const schema = z.object({
  name: z.string().min(2).max(255),

  email: z.email(),

  role: z.string().min(2).max(100),

  avatar: z.string().nullable().optional(),

  lifecycle: z.enum(["OPEN", "DRAFT"]).default("OPEN"),

  formData: z.record(z.string(), z.unknown()).default({}),

  password: z.string().min(8).max(200).optional(),
});

export async function GET() {
  try {
    return Response.json(await listUsers());
  } catch {
    return Response.json(
      {
        error: "Unable to load users",
      },
      {
        status: 503,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const value = schema.parse(await request.json());

    /*
     * Until password setup is added
     * to the New Admin design, create
     * a strong temporary password.
     */
    const password = value.password ?? randomBytes(18).toString("base64url");

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

          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
      [
        value.name,
        value.email,
        await hashPassword(password),
        value.role.trim().toLowerCase().replaceAll(" ", "_"),
        value.avatar ?? null,
        value.lifecycle,
        JSON.stringify(value.formData),
      ],
    );

    return Response.json(
      {
        id: String(result.insertId),

        name: value.name,

        email: value.email,

        role: value.role,

        avatar: value.avatar ?? null,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Invalid user",

          details: error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    console.error(error);

    return Response.json(
      {
        error: "Unable to create user",
      },
      {
        status: 409,
      },
    );
  }
}

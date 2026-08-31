import type { RowDataPacket } from "mysql2/promise";

import { getSessionUser, isAdminRole } from "@/lib/auth";
import { db } from "@/lib/db";

// Reads the session cookie + DB per request — never cache the response.
export const dynamic = "force-dynamic";

type AvatarRow = RowDataPacket & {
  mime_type: string;
  image_data: Buffer;
  updated_at: string;
};

function parseUserId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Serve a user's profile picture. Any signed-in user may fetch any
 * avatar — they show up in ticket comments, project teams, admin tables,
 * etc. — and an <img src> request carries the session cookie, so this
 * works from the page.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }

    const { userId } = await context.params;
    const id = parseUserId(userId);
    if (!id) {
      return Response.json({ error: "Invalid user id." }, { status: 400 });
    }

    const [rows] = await db.query<AvatarRow[]>(
      "SELECT mime_type, image_data, updated_at FROM user_avatars WHERE user_id = ? LIMIT 1",
      [id],
    );
    const avatar = rows[0];
    if (!avatar) {
      return Response.json({ error: "No avatar." }, { status: 404 });
    }

    return new Response(new Uint8Array(avatar.image_data), {
      headers: {
        "Content-Type": avatar.mime_type || "application/octet-stream",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=86400",
        "Last-Modified": new Date(avatar.updated_at).toUTCString(),
      },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to load avatar." }, { status: 500 });
  }
}

/**
 * Remove a user's photo. Users can clear their own; admins can clear
 * anyone's. Also nulls the `users.avatar` pointer.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }

    const { userId } = await context.params;
    const id = parseUserId(userId);
    if (!id) {
      return Response.json({ error: "Invalid user id." }, { status: 400 });
    }

    if (id !== session.id && !isAdminRole(session.role)) {
      return Response.json({ error: "Permission denied." }, { status: 403 });
    }

    await db.execute("DELETE FROM user_avatars WHERE user_id = ?", [id]);
    await db.execute(
      "UPDATE users SET avatar = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (avatar IS NULL OR avatar LIKE '/api/avatars/%')",
      [id],
    );

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Unable to remove avatar." }, { status: 500 });
  }
}

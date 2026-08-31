import "server-only";

import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES } from "@/lib/avatarConstants";
import { db } from "@/lib/db";

/*
 * Profile pictures. The image bytes live in `user_avatars` (one row per
 * user); `users.avatar` only ever holds a URL string — either
 * "/api/avatars/{id}?v={ts}" for an uploaded photo, or an external
 * "https://…" URL for the handful of legacy records that used one.
 * Every read site in the app already selects `users.avatar` and renders
 * it straight into an <img src>, so pointing the column at the serving
 * endpoint makes uploaded photos show up everywhere automatically.
 */

export { AVATAR_MAX_BYTES, AVATAR_MIME_TYPES } from "@/lib/avatarConstants";

export class AvatarError extends Error {}

type DecodedImage = { mimeType: string; bytes: Buffer };

function decodeDataUrl(value: string): DecodedImage | null {
  const comma = value.indexOf(",");
  if (comma < 0) return null;
  const header = value.slice(0, comma);
  const match = /^data:([^;,]+);base64$/.exec(header);
  if (!match) return null;
  return {
    mimeType: match[1].trim().toLowerCase(),
    bytes: Buffer.from(value.slice(comma + 1), "base64"),
  };
}

/**
 * Normalise whatever a form sent in its `avatar` field into the value to
 * store in `users.avatar`:
 *
 *  - `""` / null / undefined            → remove any stored image, return null
 *  - an existing `/api/avatars/…` URL   → unchanged (form echoed it back)
 *  - an `https://…` URL                 → unchanged (legacy external avatar)
 *  - a `data:image/…;base64,…` URL      → decode + validate + upsert
 *                                          `user_avatars`, return the
 *                                          serving URL with a cache-busting
 *                                          `?v=` stamp
 *
 * Throws `AvatarError` (message is user-facing) on an unsupported type or
 * an oversized image.
 */
export async function persistUserAvatar(
  userId: number,
  value: string | null | undefined,
): Promise<string | null> {
  const raw = (value ?? "").trim();

  if (!raw) {
    await db.execute("DELETE FROM user_avatars WHERE user_id = ?", [userId]);
    return null;
  }

  if (raw.startsWith("/api/avatars/") || /^https?:\/\//i.test(raw)) {
    return raw;
  }

  const decoded = decodeDataUrl(raw);
  if (!decoded) {
    throw new AvatarError(
      "That doesn't look like an image. Upload a PNG, JPG, WebP or GIF.",
    );
  }
  if (!(AVATAR_MIME_TYPES as readonly string[]).includes(decoded.mimeType)) {
    throw new AvatarError("Unsupported image type — use PNG, JPG, WebP or GIF.");
  }
  if (decoded.bytes.length === 0) {
    throw new AvatarError("The image file looks empty.");
  }
  if (decoded.bytes.length > AVATAR_MAX_BYTES) {
    throw new AvatarError("Image is too large — pick one under 2 MB.");
  }

  await db.execute(
    `
      INSERT INTO user_avatars (user_id, mime_type, size_bytes, image_data)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        mime_type = VALUES(mime_type),
        size_bytes = VALUES(size_bytes),
        image_data = VALUES(image_data)
    `,
    [userId, decoded.mimeType, decoded.bytes.length, decoded.bytes],
  );

  return `/api/avatars/${userId}?v=${Date.now()}`;
}

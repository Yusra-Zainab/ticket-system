/*
 * Client-safe avatar limits. `lib/avatars.ts` (server-only) re-exports
 * these; the upload UI imports them from here for a friendly pre-check
 * before sending the file.
 */

export const AVATAR_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export const AVATAR_ACCEPT = AVATAR_MIME_TYPES.join(",");

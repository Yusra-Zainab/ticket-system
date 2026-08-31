import { z } from "zod";

/*
 * Profile photos / entity avatars are stored as `data:` URL strings in
 * MySQL. Bound them so a huge upload can't blow past `max_allowed_packet`
 * and 500 (F11). ~3 MB of base64 ≈ a ~2.2 MB source image, which is
 * plenty for an avatar. The old cap of 2000 chars silently rejected
 * every real image.
 */
export const AVATAR_MAX_CHARS = 3_000_000;

export const avatarSchema = z
  .string()
  .trim()
  .max(AVATAR_MAX_CHARS, "Image is too large — use one under ~2 MB.");

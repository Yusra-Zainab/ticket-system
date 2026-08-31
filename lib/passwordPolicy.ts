/*
 * Single source of truth for the password strength rules. The pure
 * checks live in `lib/passwordRules.ts` (no Node imports, safe for
 * Client Components); this module adds the server-only helpers —
 * temp-password generation and the Zod schema — and re-exports the
 * rules so existing `@/lib/passwordPolicy` imports keep working.
 */

import { randomInt } from "node:crypto";

import { z } from "zod";

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  checkPasswordStrength,
} from "./passwordRules";

export {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  checkPasswordStrength,
  firstPasswordError,
} from "./passwordRules";
export type { PasswordCheck, PasswordRule } from "./passwordRules";

/*
 * Random temporary password that satisfies `checkPasswordStrength`.
 * Used for account onboarding instead of a shared literal (F14).
 */
export function generateTempPassword(): string {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digit = "23456789";
  const symbol = "!@#$%^&*?-_";
  const all = lower + upper + digit + symbol;

  const pick = (set: string) => set[randomInt(set.length)];
  const chars = [
    pick(lower),
    pick(upper),
    pick(digit),
    pick(symbol),
    ...Array.from({ length: 10 }, () => pick(all)),
  ];

  // Fisher–Yates shuffle so the guaranteed classes aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

/** Zod schema for a new/changed password field. */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`)
  .refine((value) => checkPasswordStrength(value).ok, {
    message:
      "Password needs upper- and lower-case letters, a number and a symbol.",
  });

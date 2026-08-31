/*
 * Pure password-strength rules with no Node built-in imports, so this
 * module is safe to import from Client Components as well as server
 * routes. `lib/passwordPolicy.ts` re-exports these alongside the
 * server-only helpers (temp-password generation, the Zod schema).
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;

export type PasswordRule = {
  label: string;
  test: (password: string) => boolean;
};

export type PasswordCheck = {
  ok: boolean;
  errors: string[];
};

/** Ordered rules — the labels double as the live checklist in the UI. */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH,
  },
  { label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "A number", test: (p) => /[0-9]/.test(p) },
  { label: "A symbol (e.g. ! @ # $)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function checkPasswordStrength(password: string): PasswordCheck {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Use at most ${PASSWORD_MAX_LENGTH} characters.`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Add a lowercase letter.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Add an uppercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Add a number.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Add a symbol (e.g. ! @ # $).");
  }

  return { ok: errors.length === 0, errors };
}

/** First failing rule, or "" when the password is acceptable. */
export function firstPasswordError(password: string): string {
  return checkPasswordStrength(password).errors[0] ?? "";
}

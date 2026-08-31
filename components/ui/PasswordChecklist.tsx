"use client";

import { Check } from "lucide-react";

import { PASSWORD_RULES } from "@/lib/passwordRules";
import { cn } from "@/lib/utils";

export type PasswordChecklistRule = { label: string; ok: boolean };

/**
 * The live "your password must…" checklist. One implementation shared by
 * every form that sets a user password (reset-password + the three profile
 * editors) so the rules — and the way they read — stay in lockstep with the
 * server (`lib/passwordRules.ts` → `passwordSchema`).
 *
 * `extraRules` appends form-specific rows (e.g. "confirmation matches").
 */
export default function PasswordChecklist({
  password,
  extraRules = [],
  className,
}: {
  password: string;
  extraRules?: PasswordChecklistRule[];
  className?: string;
}) {
  const rules: PasswordChecklistRule[] = [
    ...PASSWORD_RULES.map((rule) => ({
      label: rule.label,
      ok: rule.test(password),
    })),
    ...extraRules,
  ];

  return (
    <ul
      aria-live="polite"
      className={cn(
        "mt-2 flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg bg-slate-50 px-3 py-2.5 text-xs",
        className,
      )}
    >
      {rules.map((rule) => (
        <li
          key={rule.label}
          className={cn(
            "flex items-center gap-1.5 font-semibold",
            rule.ok ? "text-green-700" : "text-slate-400",
          )}
        >
          <Check
            size={13}
            strokeWidth={3}
            aria-hidden="true"
            className={rule.ok ? "" : "opacity-30"}
          />
          {rule.label}
        </li>
      ))}
    </ul>
  );
}

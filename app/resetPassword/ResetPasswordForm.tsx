"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, Info } from "lucide-react";

import PasswordChecklist from "@/components/ui/PasswordChecklist";
import { cn } from "@/lib/utils";
import { checkPasswordStrength } from "@/lib/passwordRules";

type FieldState = "idle" | "valid" | "invalid";

function fieldClasses(state: FieldState) {
  return cn(
    "auth-input transition-colors",
    state === "valid" && "!border-green-500 focus:!border-green-500",
    state === "invalid" && "!border-red-500 focus:!border-red-500",
  );
}

function InvalidBadge({ title }: { title: string }) {
  return (
    <span
      title={title}
      className="ml-1.5 inline-grid size-4 place-items-center rounded-full bg-red-500 align-text-bottom text-white"
    >
      <Info size={11} strokeWidth={3} />
    </span>
  );
}

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const strength = useMemo(() => checkPasswordStrength(password), [password]);

  const passwordState: FieldState =
    !touched.password || password.length === 0
      ? "idle"
      : strength.ok
        ? "valid"
        : "invalid";
  const confirmMatches =
    confirmPassword.length > 0 && password === confirmPassword;
  const confirmState: FieldState =
    !touched.confirm || confirmPassword.length === 0
      ? "idle"
      : confirmMatches
        ? "valid"
        : "invalid";

  const canSubmit = strength.ok && confirmMatches && !saving && Boolean(token);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ password: true, confirm: true });

    if (!token) {
      setError("This reset link is invalid or has expired.");
      return;
    }
    if (!strength.ok) {
      setError(strength.errors[0] ?? "Choose a stronger password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "Unable to reset password.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to reset password.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="auth-content auth-forgot-content">
      <header className="auth-header">
        <h1 className="auth-title">Reset Password</h1>

        <p className="auth-description">
          Enter your new password to complete the reset.
        </p>
      </header>

      <div className="auth-form-content">
        <form onSubmit={handleSubmit} className="auth-form auth-forgot-form">
          <div className="auth-field">
            <label className="auth-label">
              New Password
              {passwordState === "invalid" && (
                <InvalidBadge title="Password doesn't meet all the requirements below" />
              )}
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
                onBlur={() =>
                  setTouched((state) => ({ ...state, password: true }))
                }
                placeholder="Enter your password"
                className={cn(fieldClasses(passwordState), "pr-11")}
                aria-invalid={passwordState === "invalid"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((state) => !state)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {(touched.password || password.length > 0) && (
              <PasswordChecklist password={password} />
            )}
          </div>

          <div className="auth-field">
            <label className="auth-label">
              Confirm Password
              {confirmState === "invalid" && (
                <InvalidBadge title="Passwords do not match" />
              )}
            </label>

            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              onBlur={() =>
                setTouched((state) => ({ ...state, confirm: true }))
              }
              placeholder="Re-enter your password"
              className={fieldClasses(confirmState)}
              aria-invalid={confirmState === "invalid"}
            />

            {confirmState === "invalid" && (
              <span className="auth-error">Passwords do not match.</span>
            )}
            {confirmState === "valid" && (
              <span className="mt-1 flex items-center gap-1 text-xs text-green-600">
                <Check size={13} strokeWidth={3} /> Passwords match
              </span>
            )}
            {error && <span className="auth-error">{error}</span>}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="auth-primary-button disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

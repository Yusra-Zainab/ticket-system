"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError("This reset link is invalid or has expired.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
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
            <label className="auth-label">New Password</label>

            <input
              type="password"
              value={password}
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="auth-input"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Confirm Password</label>

            <input
              type="password"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Enter your password"
              className="auth-input"
            />

            {error && <span className="auth-error">{error}</span>}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="auth-primary-button"
          >
            {saving ? "Saving..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");

  const [emailError, setEmailError] = useState("");

  const [isSent, setIsSent] = useState(false);

  const [submitError, setSubmitError] = useState("");

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim()) {
      setEmailError("Email is required");

      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email");

      return;
    }

    setEmailError("");
    setSubmitError("");

    try {
      setSaving(true);

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          body.error ?? "Unable to send reset link.",
        );
      }

      setIsSent(true);
    } catch (reason) {
      setSubmitError(
        reason instanceof Error
          ? reason.message
          : "Unable to send reset link.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-content auth-forgot-content">
      <header className="auth-header">
        <h1 className="auth-title">Forgot Password</h1>

        <p className="auth-description">
          Enter your email and we&apos;ll send you a link to reset your
          password.
        </p>
      </header>

      <div className="auth-form-content">
        {!isSent ? (
          <form onSubmit={handleSubmit} className="auth-form auth-forgot-form">
            <div className="auth-field">
              <label className="auth-label">Email</label>

              <input
                type="email"
                value={email}
                autoComplete="email"
                onChange={(event) => {
                  setEmail(event.target.value);

                  if (emailError) {
                    setEmailError("");
                  }
                }}
                placeholder="Enter your email"
                className="auth-input"
              />

              {emailError && <span className="auth-error">{emailError}</span>}
            </div>

            {submitError && (
              <span className="auth-error">{submitError}</span>
            )}

            <button
              type="submit"
              disabled={saving}
              className="auth-primary-button"
            >
              {saving ? "Sending..." : "Send Link"}
            </button>
          </form>
        ) : (
          <div className="auth-sent-message">
            <p>
              If an account exists for <strong>{email}</strong>, you&apos;ll
              receive a password reset link shortly.
            </p>
          </div>
        )}
      </div>
      <div className="auth-bottom-link">
        <Link href="/login">Back</Link>
      </div>
    </div>
  );
}

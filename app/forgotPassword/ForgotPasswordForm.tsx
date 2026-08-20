"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");

  const [emailError, setEmailError] = useState("");

  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
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

    /*
     * Replace with your real password-reset API.
     */
    console.log("Password reset requested for:", email);

    setIsSent(true);
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

            <button type="submit" className="auth-primary-button">
              Send Link
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

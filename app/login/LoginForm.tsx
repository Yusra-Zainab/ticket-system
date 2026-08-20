"use client";

import Link from "next/link";
import {
  Check,
  ChevronDown,
} from "lucide-react";
import {
  useState,
} from "react";

const roles = [
  "Admin",
  "Super Admin",
  "Project Manager",
  "Developer",
  "Support Agent",
  "Client User",
] as const;

export default function LoginForm() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [role, setRole] =
    useState("Admin");

  const [roleOpen, setRoleOpen] =
    useState(false);

  const [emailError, setEmailError] =
    useState("");

  const [passwordError, setPasswordError] =
    useState("");

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    let valid = true;

    if (!email.trim()) {
      setEmailError("Email is required");
      valid = false;
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      )
    ) {
      setEmailError(
        "Please enter a valid email",
      );

      valid = false;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError(
        "Password is required",
      );

      valid = false;
    } else if (
      password.length < 6
    ) {
      setPasswordError(
        "Password must be at least 6 characters",
      );

      valid = false;
    } else {
      setPasswordError("");
    }

    if (!valid) {
      return;
    }

    /*
     * Connect this to your real authentication
     * endpoint when ready.
     */
    console.log("Login attempt", {
      email,
      role,
    });
  };

  return (
    <div className="auth-form-content">
      <form
        onSubmit={handleSubmit}
        className="auth-form"
      >
        <AuthField
          label="Email"
          error={emailError}
        >
          <input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => {
              setEmail(
                event.target.value,
              );

              if (emailError) {
                setEmailError("");
              }
            }}
            placeholder="Enter your email"
            className="auth-input"
          />
        </AuthField>

        <AuthField
          label="Password"
          error={passwordError}
        >
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => {
              setPassword(
                event.target.value,
              );

              if (passwordError) {
                setPasswordError("");
              }
            }}
            placeholder="Enter your password"
            className="auth-input"
          />
        </AuthField>

        <AuthField label="Role">
          <div className="auth-select">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={roleOpen}
              onClick={() =>
                setRoleOpen(
                  (current) => !current,
                )
              }
              className="auth-select-trigger"
            >
              <span>
                {role}
              </span>

              <ChevronDown
                size={20}
                className={
                  roleOpen
                    ? "rotate-180"
                    : ""
                }
              />
            </button>

            {roleOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close role menu"
                  className="auth-dropdown-backdrop"
                  onClick={() =>
                    setRoleOpen(false)
                  }
                />

                <div
                  role="listbox"
                  className="auth-select-menu"
                >
                  {roles.map(
                    (option) => (
                      <button
                        key={option}
                        type="button"
                        role="option"
                        aria-selected={
                          role === option
                        }
                        onClick={() => {
                          setRole(option);
                          setRoleOpen(
                            false,
                          );
                        }}
                        className="auth-select-option"
                      >
                        <span>
                          {option}
                        </span>

                        {role ===
                          option && (
                          <Check
                            size={16}
                          />
                        )}
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
          </div>
        </AuthField>

        <button
          type="submit"
          className="auth-primary-button"
        >
          Sign in
        </button>

        <div className="auth-bottom-link">
          <Link href="/forgotPassword">
            Forgot password
          </Link>
        </div>
      </form>
    </div>
  );
}

function AuthField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="auth-field">
      <label className="auth-label">
        {label}
      </label>

      {children}

      {error && (
        <span className="auth-error">
          {error}
        </span>
      )}
    </div>
  );
}
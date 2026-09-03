"use client";

import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Eye,
  EyeOff,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import AvatarUpload from "@/components/ui/AvatarUpload";
import PasswordChecklist from "@/components/ui/PasswordChecklist";
import { checkPasswordStrength, firstPasswordError } from "@/lib/passwordRules";
import type { ResourcePortalProfile } from "@/types/resourcePortal";

function initials(profile: ResourcePortalProfile) {
  return (
    `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase() ||
    "R"
  );
}

function formatRole(role: string) {
  return role
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ResourceProfileForm({
  profile,
}: {
  profile: ResourcePortalProfile;
}) {
  const router = useRouter();

  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [jobTitle, setJobTitle] = useState(profile.jobTitle);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [emailNotifications, setEmailNotifications] = useState(
    profile.emailNotifications,
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const displayName = `${firstName} ${lastName}`.trim() || profile.name;

  const passwordStarted = newPassword.length > 0 || confirmPassword.length > 0;
  const passwordValid =
    newPassword.length > 0 && checkPasswordStrength(newPassword).ok;
  const confirmStarted = confirmPassword.length > 0;
  const confirmValid =
    confirmStarted && passwordValid && confirmPassword === newPassword;

  const passwordError = !passwordStarted
    ? ""
    : !newPassword
      ? "Enter a new password."
      : firstPasswordError(newPassword);

  const confirmPasswordError = !passwordStarted
    ? ""
    : !confirmPassword
      ? "Confirm the new password."
      : !passwordValid
        ? "Fix the new password first."
        : confirmPassword !== newPassword
          ? "Passwords do not match."
          : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!firstName.trim()) {
      setError("First name is required.");
      document.getElementById("resource-edit-first-name")?.focus();
      return;
    }

    if (passwordStarted && (passwordError || confirmPasswordError)) {
      setError(passwordError || confirmPasswordError);
      document.getElementById("resource-edit-new-password")?.focus();
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch("/api/resource-portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          jobTitle,
          avatar,
          emailNotifications,
          ...(passwordValid ? { newPassword } : {}),
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Unable to save resource details.");
      }

      router.push("/resource-portal/profile");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to save resource details.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="resource-edit-details-page" onSubmit={submit}>
      <header className="resource-edit-details-header">
        <div className="resource-edit-details-title-row">
          <h1>Edit Resource Details</h1>

          <div className="resource-edit-details-actions">
            <Link
              href="/resource-portal/profile"
              className="resource-edit-details-cancel"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="resource-edit-details-save"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </header>

      {error ? (
        <div className="resource-edit-details-alert" role="alert">
          <XCircle size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="resource-edit-details-identity">
        <div className="resource-edit-details-avatar-wrap">
          <div className="resource-edit-details-avatar">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={displayName} />
            ) : (
              initials(profile)
            )}
          </div>
        </div>

        <div className="resource-edit-details-identity-copy">
          <h2>{displayName}</h2>
          <p>{jobTitle || "Resource"}</p>
        </div>
      </section>

      <main className="resource-edit-details-content">
        <EditSection title="Basic Resource Information">
          <div className="resource-edit-details-grid">
            <EditField label="First Name" required>
              <input
                id="resource-edit-first-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                className={
                  firstName.trim()
                    ? "resource-edit-input is-valid"
                    : "resource-edit-input"
                }
              />
            </EditField>

            <EditField label="Last Name">
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                className="resource-edit-input"
              />
            </EditField>

            <EditField label="Phone Number">
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                type="tel"
                className="resource-edit-input"
              />
            </EditField>

            <EditField label="Job Title">
              <input
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                className="resource-edit-input"
              />
            </EditField>
          </div>
        </EditSection>

        <EditSection title="Profile Image">
          <AvatarUpload
            value={avatar}
            onChange={setAvatar}
            name={displayName}
          />
        </EditSection>

        <EditSection title="Account & Security" id="account">
          <div className="resource-edit-details-grid">
            <EditField label="Work Email">
              <input
                value={profile.email}
                readOnly
                disabled
                className="resource-edit-input is-readonly"
              />
            </EditField>

            <EditField label="Role">
              <input
                value={formatRole(profile.role)}
                readOnly
                disabled
                className="resource-edit-input is-readonly"
              />
            </EditField>

            <PasswordField
              id="resource-edit-new-password"
              label="New Password"
              value={newPassword}
              onChange={setNewPassword}
              show={showNewPassword}
              onToggle={() => setShowNewPassword((value) => !value)}
              valid={passwordValid}
              invalid={passwordStarted && Boolean(passwordError)}
              message={passwordError || (passwordValid ? "Password is valid." : "")}
              placeholder="Leave blank to keep current password"
            />

            <PasswordField
              id="resource-edit-confirm-password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((value) => !value)}
              valid={confirmValid}
              invalid={passwordStarted && Boolean(confirmPasswordError)}
              message={
                confirmPasswordError ||
                (confirmValid ? "Passwords match." : "")
              }
              placeholder="Re-enter the new password"
            />
          </div>

          {passwordStarted ? (
            <PasswordChecklist
              password={newPassword}
              extraRules={[
                {
                  label: "Confirmation matches the new password",
                  ok: confirmValid,
                },
              ]}
            />
          ) : null}
        </EditSection>

        <EditSection title="Notifications" id="notifications">
          <label className="resource-edit-notification-row">
            <span className="resource-edit-notification-icon">
              <Bell size={20} />
            </span>
            <span className="resource-edit-notification-copy">
              <strong>Email Notifications</strong>
              <small>Receive updates for tickets and project activity.</small>
            </span>
            <input
              type="checkbox"
              checked={emailNotifications}
              onChange={(event) => setEmailNotifications(event.target.checked)}
              className="resource-edit-notification-checkbox"
            />
          </label>
        </EditSection>
      </main>

      <ResourceEditDetailsStyles />
    </form>
  )
}

function EditSection({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="resource-edit-details-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function EditField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="resource-edit-details-field">
      <span>
        {label}
        {required ? <b>*</b> : null}
      </span>
      {children}
    </label>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  valid,
  invalid,
  message,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  valid: boolean;
  invalid: boolean;
  message: string;
  placeholder: string;
}) {
  return (
    <label className="resource-edit-details-field">
      <span>{label}</span>
      <span
        className={[
          "resource-edit-password-shell",
          valid ? "is-valid" : "",
          invalid ? "is-invalid" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? `Hide ${label}` : `Show ${label}`}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {message ? (
        <small
          className={
            valid
              ? "resource-edit-field-message is-valid"
              : "resource-edit-field-message is-invalid"
          }
        >
          {valid ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {message}
        </small>
      ) : null}
    </label>
  );
}


function ResourceEditDetailsStyles() {
  return (
    <style>{`
      .resource-edit-details-page,
      .resource-edit-details-page * {
        box-sizing: border-box;
      }

      .resource-edit-details-page {
        width: 100%;
        min-width: 0;
        min-height: 850px;
        padding: 0 0 120px;
        background: #ffffff;
        color: #101828;
        font-family: var(--font-geist), var(--font-inter), Inter, Arial, sans-serif;
      }

      .resource-edit-details-header {
        position: sticky;
        top: 0;
        z-index: 24;
        width: 100%;
        margin-bottom: 24px;
        border-bottom: 1px solid #eaecf0;
        background: rgb(255 255 255 / 0.97);
        padding: 12px 0 16px;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      .resource-edit-details-title-row {
        display: flex;
        min-height: 40px;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }

      .resource-edit-details-header h1 {
        margin: 0;
        color: #101828;
        font-family: var(--font-satoshi), var(--font-satoshi), sans-serif;
        font-size: 30px;
        font-weight: 700;
        line-height: 38px;
      }

      .resource-edit-details-actions {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 12px;
      }

      .resource-edit-details-cancel,
      .resource-edit-details-save {
        display: inline-flex;
        height: 40px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        gap: 4px;
        border-radius: 8px;
        padding: 10px 14px;
        font-family: var(--font-geist), sans-serif;
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
        text-decoration: none;
        cursor: pointer;
        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
      }

      .resource-edit-details-cancel {
        width: 134px;
        border: 1px solid #06b6d4;
        background: #ffffff;
        color: #0284c7;
      }

      .resource-edit-details-save {
        width: 128px;
        min-width: 128px;
        border: 0;
        background: linear-gradient(
          66.43deg,
          #0284c7 12.82%,
          #06b6d4 47.68%,
          #22d3ee 82.54%
        );
        color: #ffffff;
        white-space: nowrap;
      }

      .resource-edit-details-save:hover:not(:disabled) {
        filter: brightness(0.98);
      }

      .resource-edit-details-save:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .resource-edit-details-alert {
        display: flex;
        width: 100%;
        align-items: center;
        gap: 8px;
        margin-bottom: 20px;
        border: 1px solid #fda29b;
        border-radius: 8px;
        background: #fef3f2;
        padding: 10px 14px;
        color: #b42318;
        font-size: 14px;
        font-weight: 600;
      }

      .resource-edit-details-identity {
        position: relative;
        display: flex;
        width: 100%;
        min-height: 64px;
        align-items: flex-start;
        gap: 24px;
        margin-bottom: 24px;
      }

      .resource-edit-details-avatar-wrap {
        position: relative;
        width: 64px;
        height: 64px;
        flex: 0 0 64px;
      }

      .resource-edit-details-avatar {
        display: grid;
        width: 64px;
        height: 64px;
        place-items: center;
        overflow: hidden;
        border: 1.5px solid #ffffff;
        border-radius: 200px;
        background: #cfcbdc;
        color: #344054;
        font-size: 18px;
        font-weight: 700;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
      }

      .resource-edit-details-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .resource-edit-details-avatar-button {
        position: absolute;
        right: -3px;
        bottom: 0;
        display: grid;
        width: 24px;
        height: 24px;
        place-items: center;
        border: 0;
        border-radius: 66px;
        background: #b2e8f2;
        color: #0284c7;
        cursor: pointer;
      }

      .resource-edit-details-identity-copy {
        min-width: 0;
        flex: 1;
      }

      .resource-edit-details-identity-copy h2 {
        margin: 0;
        color: #101828;
        font-family: var(--font-satoshi), var(--font-satoshi), var(--font-geist), sans-serif;
        font-size: 24px;
        font-weight: 700;
        line-height: 32px;
      }

      .resource-edit-details-identity-copy p {
        margin: 0;
        color: #101828;
        font-size: 20px;
        font-weight: 500;
        line-height: 30px;
      }

      .resource-edit-details-content {
        display: flex;
        width: 100%;
        flex-direction: column;
        gap: 24px;
      }

      .resource-edit-details-section {
        display: flex;
        width: 100%;
        scroll-margin-top: 100px;
        flex-direction: column;
        gap: 16px;
      }

      .resource-edit-details-section h2 {
        margin: 0;
        color: #101828;
        font-family: var(--font-geist), sans-serif;
        font-size: 20px;
        font-weight: 600;
        line-height: 30px;
      }

      .resource-edit-details-grid {
        display: grid;
        width: 100%;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px 32px;
      }

      .resource-edit-details-field {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 6px;
      }

      .resource-edit-details-field > span:first-child {
        color: #344054;
        font-family: var(--font-geist), Inter, sans-serif;
        font-size: 14px;
        font-weight: 500;
        line-height: 20px;
      }

      .resource-edit-details-field > span:first-child b {
        margin-left: 3px;
        color: #f04438;
      }

      .resource-edit-input,
      .resource-edit-password-shell {
        width: 100%;
        min-height: 44px;
        border: 1px solid #d0d5dd;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
      }

      .resource-edit-input {
        padding: 10px 14px;
        color: #101828;
        font-family: var(--font-geist), Inter, sans-serif;
        font-size: 16px;
        font-weight: 400;
        line-height: 24px;
        outline: none;
      }

      .resource-edit-input:focus,
      .resource-edit-password-shell:focus-within {
        border-color: #06b6d4;
        box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
      }

      .resource-edit-input.is-valid,
      .resource-edit-password-shell.is-valid {
        border: 2px solid #47cd89;
        box-shadow: 0 0 0 3px rgba(71, 205, 137, 0.1);
      }

      .resource-edit-password-shell.is-invalid {
        border: 2px solid #f04438;
        box-shadow: 0 0 0 3px rgba(240, 68, 56, 0.08);
      }

      .resource-edit-input.is-readonly {
        background: #f9fafb;
        color: #667085;
        cursor: not-allowed;
      }

      .resource-edit-password-shell {
        display: flex;
        align-items: center;
        overflow: hidden;
      }

      .resource-edit-password-shell input {
        min-width: 0;
        min-height: 42px;
        flex: 1;
        border: 0;
        background: transparent;
        padding: 9px 0 9px 14px;
        color: #101828;
        font-family: var(--font-geist), Inter, sans-serif;
        font-size: 16px;
        line-height: 24px;
        outline: none;
      }

      .resource-edit-password-shell button {
        display: grid;
        width: 48px;
        height: 42px;
        flex: 0 0 48px;
        place-items: center;
        border: 0;
        background: transparent;
        color: #98a2b3;
        cursor: pointer;
      }

      .resource-edit-field-message {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        font-weight: 600;
        line-height: 18px;
      }

      .resource-edit-field-message.is-valid {
        color: #067647;
      }

      .resource-edit-field-message.is-invalid {
        color: #b42318;
      }

      .resource-edit-notification-row {
        display: flex;
        width: 100%;
        min-height: 76px;
        align-items: center;
        gap: 12px;
        border: 1px solid #eaecf0;
        border-radius: 12px;
        background: #ffffff;
        padding: 16px;
      }

      .resource-edit-notification-icon {
        display: grid;
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        place-items: center;
        border-radius: 8px;
        background: #e6f8fb;
        color: #0284c7;
      }

      .resource-edit-notification-copy {
        min-width: 0;
        flex: 1;
      }

      .resource-edit-notification-copy strong,
      .resource-edit-notification-copy small {
        display: block;
      }

      .resource-edit-notification-copy strong {
        color: #344054;
        font-size: 14px;
        font-weight: 600;
      }

      .resource-edit-notification-copy small {
        margin-top: 3px;
        color: #667085;
        font-size: 13px;
      }

      .resource-edit-notification-checkbox {
        width: 20px;
        height: 20px;
        accent-color: #0284c7;
      }

      @media (max-width: 1000px) {
        .resource-edit-details-title-row {
          align-items: flex-start;
          flex-direction: column;
        }

        .resource-edit-details-actions {
          flex-wrap: wrap;
        }

        .resource-edit-details-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 700px) {
        .resource-edit-details-page {
          padding-right: 16px;
          padding-left: 16px;
        }

        .resource-edit-details-header h1 {
          font-size: 26px;
          line-height: 34px;
        }

        .resource-edit-details-actions {
          width: 100%;
        }

        .resource-edit-details-actions > * {
          flex: 1 1 auto;
          width: auto;
          min-width: 0;
        }

        .resource-edit-details-save {
          white-space: nowrap;
        }

        .resource-edit-details-identity-copy h2 {
          font-size: 21px;
        }

        .resource-edit-details-identity-copy p {
          font-size: 16px;
        }
      }
    `}</style>
  )
}
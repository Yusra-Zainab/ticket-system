"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import AvatarUpload from "@/components/ui/AvatarUpload";
import PasswordChecklist from "@/components/ui/PasswordChecklist";
import StickyToast from "@/components/ui/StickyToast";
import { firstPasswordError } from "@/lib/passwordRules";
import type { ClientPortalProfile } from "@/types/clientPortal";

type EditableProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  jobTitle: string;
  avatar: string;
  emailNotifications: boolean;
};

const emptyClientProfile: ClientPortalProfile = {
  id: 0,
  firstName: "",
  lastName: "",
  name: "Client User",
  email: "",
  phone: "",
  jobTitle: "",
  avatar: "",
  company: "",
  role: "client",
  emailNotifications: true,
};

function editableValues(
  profile?: ClientPortalProfile | null,
): EditableProfile {
  const safeProfile = profile ?? emptyClientProfile;

  return {
    firstName: safeProfile.firstName,
    lastName: safeProfile.lastName,
    phone: safeProfile.phone,
    jobTitle: safeProfile.jobTitle,
    avatar: safeProfile.avatar,
    emailNotifications: safeProfile.emailNotifications,
  };
}

export default function ClientProfileForm({
  profile,
}: {
  profile?: ClientPortalProfile | null;
}) {
  const router = useRouter();
  const safeProfile = profile ?? emptyClientProfile;

  const [values, setValues] = useState<EditableProfile>(() =>
    editableValues(safeProfile),
  );
  const [original, setOriginal] = useState<EditableProfile>(() =>
    editableValues(safeProfile),
  );

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeKind, setNoticeKind] = useState<"success" | "error">(
    "error",
  );

  const fullName =
    `${values.firstName} ${values.lastName}`.trim() ||
    safeProfile.name ||
    "Client User";

  const roleLabel = safeProfile.role
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const changed = useMemo(
    () =>
      JSON.stringify(values) !== JSON.stringify(original) ||
      newPassword !== "" ||
      confirmPassword !== "",
    [values, original, newPassword, confirmPassword],
  );

  const passwordError =
    newPassword.length > 0 ? firstPasswordError(newPassword) : "";

  const confirmPasswordError =
    confirmPassword.length > 0 && newPassword !== confirmPassword
      ? "Passwords do not match."
      : "";

  const newPasswordStateClass =
    newPassword.length === 0
      ? ""
      : passwordError
        ? "profile-input-invalid"
        : "profile-input-valid";

  const confirmPasswordStateClass =
    confirmPassword.length === 0
      ? ""
      : confirmPasswordError || passwordError
        ? "profile-input-invalid"
        : "profile-input-valid";

  function setField<K extends keyof EditableProfile>(
    field: K,
    value: EditableProfile[K],
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetChanges() {
    setValues(original);
    setNewPassword("");
    setConfirmPassword("");
    setNotice("");
  }

  async function saveChanges() {
    if (!changed || saving) return;

    if (!values.firstName.trim()) {
      setNoticeKind("error");
      setNotice("First name is required.");
      return;
    }

    if (passwordError) {
      setNoticeKind("error");
      setNotice(passwordError);
      return;
    }

    if (confirmPasswordError) {
      setNoticeKind("error");
      setNotice(confirmPasswordError);
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setNoticeKind("error");
      setNotice("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    setNotice("");

    try {
      const response = await fetch("/api/client-portal/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          phone: values.phone.trim(),
          jobTitle: values.jobTitle.trim(),
          avatar: values.avatar.trim(),
          emailNotifications: values.emailNotifications,
          ...(newPassword ? { newPassword } : {}),
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error || "Unable to save profile changes.");
      }

      const nextValues: EditableProfile = {
        ...values,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        phone: values.phone.trim(),
        jobTitle: values.jobTitle.trim(),
        avatar: values.avatar.trim(),
      };

      setValues(nextValues);
      setOriginal(nextValues);
      setNewPassword("");
      setConfirmPassword("");

      router.push("/client-portal/profile");
      router.refresh();
    } catch (error) {
      setNoticeKind("error");
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to save profile changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-page client-profile-edit-page">
      <style>{`
        .client-profile-edit-page .profile-avatar {
          overflow: hidden;
        }

        .client-profile-edit-page .profile-avatar img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .client-profile-edit-page .client-profile-readonly {
          background: #f9fafb;
          color: #667085;
          cursor: not-allowed;
        }

        .client-profile-edit-page .client-profile-span-2 {
          grid-column: 1 / -1;
        }

        .client-profile-edit-page .client-profile-toggle-field {
          min-height: 70px;
          justify-content: flex-start;
        }

        .client-profile-edit-page .client-profile-toggle-row {
          display: flex;
          min-height: 44px;
          align-items: center;
          gap: 10px;
          color: #667085;
          font-family: Geist, var(--font-inter), Inter, sans-serif;
          font-size: 16px;
          line-height: 24px;
        }

        @media (max-width: 800px) {
          .client-profile-edit-page .client-profile-span-2 {
            grid-column: auto;
          }
        }
      `}</style>

      <header className="profile-page-header">
        <h1 className="profile-page-title">Profile Details</h1>

        <div className="profile-header-actions">
          <button
            type="button"
            disabled={!changed || saving}
            onClick={resetChanges}
            className="profile-outline-button"
          >
            Reset Changes
          </button>

          <button
            type="button"
            disabled={!changed || saving}
            onClick={() => void saveChanges()}
            className="profile-primary-button"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </header>

      <main className="profile-content">
        <div className="profile-identity">
          <div
            className="profile-avatar"
            aria-label={fullName}
            title={fullName}
          >
            {values.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={values.avatar} alt="" />
            ) : (
              <>
                {(values.firstName[0] ?? fullName[0] ?? "C").toUpperCase()}
                {(values.lastName[0] ?? "").toUpperCase()}
              </>
            )}
          </div>

          <div className="profile-identity-copy">
            <h2>{fullName}</h2>
            <p>{values.jobTitle || roleLabel}</p>
          </div>
        </div>

        <section className="profile-section">
          <h3 className="profile-section-title">Profile Photo</h3>
          <AvatarUpload
            value={values.avatar}
            onChange={(next) => setField("avatar", next)}
            name={fullName}
          />
        </section>

        <section className="profile-section">
          <h3 className="profile-section-title">Personal Information</h3>

          <div className="profile-edit-grid">
            <ProfileField label="First Name">
              <input
                value={values.firstName}
                onChange={(event) =>
                  setField("firstName", event.target.value)
                }
                className="profile-input"
                autoComplete="given-name"
              />
            </ProfileField>

            <ProfileField label="Last Name">
              <input
                value={values.lastName}
                onChange={(event) =>
                  setField("lastName", event.target.value)
                }
                className="profile-input"
                autoComplete="family-name"
              />
            </ProfileField>

            <ProfileField label="Phone Number">
              <input
                type="tel"
                value={values.phone}
                onChange={(event) =>
                  setField("phone", event.target.value)
                }
                className="profile-input"
                autoComplete="tel"
              />
            </ProfileField>

            <ProfileField label="Job Title">
              <input
                value={values.jobTitle}
                onChange={(event) =>
                  setField("jobTitle", event.target.value)
                }
                className="profile-input"
              />
            </ProfileField>

            <ProfileField
              label="Profile Image URL"
              className="client-profile-span-2"
            >
              <input
                value={values.avatar}
                onChange={(event) =>
                  setField("avatar", event.target.value)
                }
                className="profile-input"
                placeholder="https://..."
              />
            </ProfileField>
          </div>
        </section>

        <section className="profile-section">
          <h3 className="profile-section-title">Account Information</h3>

          <div className="profile-edit-grid">
            <ProfileField label="Company Email">
              <input
                value={safeProfile.email}
                readOnly
                className="profile-input client-profile-readonly"
              />
            </ProfileField>

            <ProfileField label="Company">
              <input
                value={safeProfile.company || "Not linked"}
                readOnly
                className="profile-input client-profile-readonly"
              />
            </ProfileField>

            <ProfileField label="Role">
              <input
                value={roleLabel}
                readOnly
                className="profile-input client-profile-readonly"
              />
            </ProfileField>

            <ProfileField
              label="Email Notifications"
              className="client-profile-toggle-field"
            >
              <div className="client-profile-toggle-row">
                <button
                  type="button"
                  role="switch"
                  aria-checked={values.emailNotifications}
                  className={
                    values.emailNotifications
                      ? "profile-toggle profile-toggle-on"
                      : "profile-toggle"
                  }
                  onClick={() =>
                    setField(
                      "emailNotifications",
                      !values.emailNotifications,
                    )
                  }
                >
                  <span />
                </button>

                <span>
                  {values.emailNotifications ? "Enabled" : "Disabled"}
                </span>
              </div>
            </ProfileField>
          </div>
        </section>

        <section className="profile-section">
          <h3 className="profile-section-title">Account Security</h3>

          <div className="profile-edit-grid">
            <ProfileField label="Current Password">
              <div className="profile-password-input">
                <input
                  type="password"
                  value="************"
                  readOnly
                  className="profile-input client-profile-readonly"
                />

                <Eye size={20} />
              </div>
            </ProfileField>

            <ProfileField label="New Password">
              <div className="profile-password-input">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  className={`profile-input ${newPasswordStateClass}`.trim()}
                />

                <button
                  type="button"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>

              {passwordError ? (
                <span className="profile-field-error">
                  {passwordError}
                </span>
              ) : null}

              {newPassword.length > 0 ? (
                <PasswordChecklist password={newPassword} />
              ) : null}
            </ProfileField>

            <ProfileField label="Confirm Password">
              <div className="profile-password-input">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className={`profile-input ${confirmPasswordStateClass}`.trim()}
                />
              </div>

              {confirmPasswordError ? (
                <span className="profile-field-error">
                  {confirmPasswordError}
                </span>
              ) : null}
            </ProfileField>
          </div>
        </section>
      </main>

      {notice ? (
        <StickyToast
          message={notice}
          kind={noticeKind}
          onDismiss={() => setNotice("")}
        />
      ) : null}

    </div>
  );
}

function ProfileField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={
        className
          ? `profile-field ${className}`
          : "profile-field"
      }
    >
      <span>{label}</span>
      {children}
    </label>
  );
}

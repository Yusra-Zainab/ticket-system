"use client";

import { ChevronDown, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import StickyToast from "@/components/ui/StickyToast";

type ProfileData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  timeZone: string;
  role: string;
  twoFactorEnabled?: boolean;
};

export default function EditProfileForm({
  initialProfile,
}: {
  initialProfile: ProfileData;
}) {
  const router = useRouter();

  const [values, setValues] = useState(initialProfile);
  const [original, setOriginal] = useState(initialProfile);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [timeZoneOpen, setTimeZoneOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [, setError] = useState("");
  const [notice, setNotice] = useState("");

  const timeZones = useMemo(
    () =>
      typeof Intl.supportedValuesOf === "function"
        ? Intl.supportedValuesOf("timeZone")
        : [
            "Africa/Cairo",
            "America/Chicago",
            "America/Los_Angeles",
            "America/New_York",
            "Asia/Dubai",
            "Asia/Karachi",
            "Asia/Tokyo",
            "Australia/Sydney",
            "Europe/Berlin",
            "Europe/Dublin",
            "Europe/London",
            "UTC",
          ],
    [],
  );

  const changed = useMemo(
    () =>
      JSON.stringify(values) !== JSON.stringify(original) ||
      newPassword !== "" ||
      confirmPassword !== "",
    [values, original, newPassword, confirmPassword],
  );
  const passwordError =
    newPassword.length > 0 && newPassword.length < 8
      ? "Password must be at least 8 characters."
      : !/\S/.test(newPassword) && newPassword.length > 0
        ? "Password must include at least one non-space character."
        : "";
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

  function setField(field: keyof ProfileData, value: string) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetChanges() {
    setValues(original);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setNotice("");
  }

  async function saveChanges() {
    if (!changed) {
      return;
    }

    if (!values.email.trim()) {
      setError("Email address is required.");
      setNotice("Email address is required.");
      return;
    }

    if (passwordError) {
      setError(passwordError);
      setNotice(passwordError);
      return;
    }

    if (confirmPasswordError) {
      setError(confirmPasswordError);
      setNotice(confirmPasswordError);
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      setNotice("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          ...(newPassword ? { newPassword } : {}),
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Unable to save profile changes.");
      }

      setOriginal(values);
      setNewPassword("");
      setConfirmPassword("");

      router.push("/profile");
      router.refresh();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Unable to save profile changes.";
      setError(message);
      setNotice(message);
    } finally {
      setSaving(false);
    }
  }

  const fullName = `${values.firstName} ${values.lastName}`.trim();

  return (
    <div className="profile-page">
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
          <div className="profile-avatar" aria-label={fullName || "Profile User"}>
            {(values.firstName[0] ?? "A").toUpperCase()}
            {(values.lastName[0] ?? "D").toUpperCase()}
          </div>

          <div className="profile-identity-copy">
            <h2>{fullName || "Profile User"}</h2>
            <p>{values.role}</p>
          </div>
        </div>

        <section className="profile-section">
          <h3 className="profile-section-title">Personal Information</h3>

          <div className="profile-edit-grid">
            <ProfileField label="Email Address">
              <input
                type="email"
                value={values.email}
                onChange={(event) => setField("email", event.target.value)}
                className="profile-input"
              />
            </ProfileField>

            <ProfileField label="Phone Number">
              <input
                value={values.phone}
                onChange={(event) => setField("phone", event.target.value)}
                className="profile-input"
              />
            </ProfileField>

            <ProfileField label="Job Title">
              <input
                value={values.jobTitle}
                onChange={(event) => setField("jobTitle", event.target.value)}
                className="profile-input"
              />
            </ProfileField>

            <ProfileField label="Time Zone">
              <div className="profile-select">
                <button
                  type="button"
                  className="profile-select-trigger"
                  onClick={() => setTimeZoneOpen((current) => !current)}
                >
                  <span>{values.timeZone}</span>
                  <ChevronDown size={20} />
                </button>

                {timeZoneOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close timezone menu"
                      className="profile-select-backdrop"
                      onClick={() => setTimeZoneOpen(false)}
                    />

                    <div className="profile-select-menu">
                      {timeZones.map((zone) => (
                        <button
                          key={zone}
                          type="button"
                          className="profile-select-option"
                          onClick={() => {
                            setField("timeZone", zone);
                            setTimeZoneOpen(false);
                          }}
                        >
                          {zone}
                        </button>
                      ))}
                    </div>
                  </>
                )}
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
                  className="profile-input"
                />

                <Eye size={20} />
              </div>
            </ProfileField>

            <ProfileField label="New Password">
              <div className="profile-password-input">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter new password"
                  className={`profile-input ${newPasswordStateClass}`.trim()}
                />

                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  <Eye size={20} />
                </button>
              </div>

              {passwordError && (
                <span className="profile-field-error">{passwordError}</span>
              )}
            </ProfileField>

            <ProfileField label="Confirm Password">
              <>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  className={`profile-input ${confirmPasswordStateClass}`.trim()}
                />

                {confirmPasswordError && (
                  <span className="profile-field-error">
                    {confirmPasswordError}
                  </span>
                )}
              </>
            </ProfileField>
          </div>
        </section>

      </main>

      {notice && (
        <StickyToast
          message={notice}
          kind="error"
          onDismiss={() => {
            setNotice("");
            setError("");
          }}
        />
      )}
    </div>
  );
}

function ProfileField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="profile-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

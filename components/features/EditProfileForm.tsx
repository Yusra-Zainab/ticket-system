"use client";

import { ChevronDown, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const initialProfile = {
  firstName: "Ahmed",
  lastName: "Khan",
  email: "amasood@datapulsetechnologies.org",
  phone: "+353-5222-5669",
  jobTitle: "Project Coordinator",
  timeZone: "GMT+1 IST (Ireland)",
  role: "Admin",
};

const timeZones = [
  "GMT+1 IST (Ireland)",
  "GMT London",
  "GMT+1 Central European Time",
  "GMT+4 Gulf Standard Time",
  "GMT+5 Pakistan Standard Time",
];

export default function EditProfileForm() {
  const router = useRouter();

  const [values, setValues] = useState(initialProfile);

  const [original, setOriginal] = useState(initialProfile);

  const [newPassword, setNewPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [timeZoneOpen, setTimeZoneOpen] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const changed = useMemo(
    () =>
      JSON.stringify(values) !== JSON.stringify(original) ||
      newPassword !== "" ||
      confirmPassword !== "",
    [values, original, newPassword, confirmPassword],
  );

  function setField(field: keyof typeof values, value: string) {
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
  }

  async function saveChanges() {
    if (!changed) {
      return;
    }

    if (!values.email.trim()) {
      setError("Email address is required.");

      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");

      return;
    }

    setSaving(true);
    setError("");

    try {
      /*
       * Replace this with your profile API once
       * your authentication/current-user endpoint
       * is available.
       */
      const payload = {
        ...values,

        ...(newPassword
          ? {
              password: newPassword,
            }
          : {}),
      };

      console.log("Save profile:", payload);

      setOriginal(values);
      setNewPassword("");
      setConfirmPassword("");

      router.push("/profile");
      router.refresh();
    } catch {
      setError("Unable to save profile changes.");
    } finally {
      setSaving(false);
    }
  }

  const fullName = `${values.firstName} ${values.lastName}`.trim();

  return (
    <div className="profile-page">
      {/* =====================================================
          STICKY HEADER
         ===================================================== */}
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
        {/* =================================================
            IDENTITY
           ================================================= */}
        <div className="profile-identity">
          <div className="profile-avatar" aria-label={fullName}>
            AK
          </div>

          <div className="profile-identity-copy">
            <h2>{fullName || "Profile User"}</h2>

            <p>{values.role}</p>
          </div>
        </div>

        {/* =================================================
            PERSONAL INFORMATION
           ================================================= */}
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

        {/* =================================================
            ACCOUNT SECURITY
           ================================================= */}
        <section className="profile-section">
          <h3 className="profile-section-title">Account Security</h3>

          <div className="profile-edit-grid">
            <ProfileField label="Current Password">
              <div className="profile-password-input">
                <input
                  type="password"
                  value="••••••••••••"
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
                  className="profile-input"
                />

                <button
                  type="button"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  <Eye size={20} />
                </button>
              </div>
            </ProfileField>

            <ProfileField label="Confirm Password">
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                className="profile-input"
              />
            </ProfileField>
          </div>
        </section>

        {error && (
          <div role="alert" className="profile-error">
            {error}
          </div>
        )}
      </main>
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

"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { useState } from "react";

import StickyToast from "@/components/ui/StickyToast";
import type { ClientPortalProfile } from "@/types/clientPortal";

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

export default function ClientProfileDetails({
  profile,
}: {
  profile?: ClientPortalProfile | null;
}) {
  const safeProfile = profile ?? emptyClientProfile;

  const [emailNotifications, setEmailNotifications] = useState(
    safeProfile.emailNotifications,
  );
  const [savingNotificationPreference, setSavingNotificationPreference] =
    useState(false);
  const [notice, setNotice] = useState("");

  const fullName =
    `${safeProfile.firstName} ${safeProfile.lastName}`.trim() ||
    safeProfile.name ||
    "Client User";

  const roleLabel = safeProfile.role
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  async function toggleEmailNotifications() {
    if (savingNotificationPreference) return;

    const nextValue = !emailNotifications;
    setEmailNotifications(nextValue);
    setSavingNotificationPreference(true);
    setNotice("");

    try {
      const response = await fetch("/api/client-portal/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: safeProfile.firstName,
          lastName: safeProfile.lastName,
          phone: safeProfile.phone,
          jobTitle: safeProfile.jobTitle,
          avatar: safeProfile.avatar,
          emailNotifications: nextValue,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          body.error || "Unable to update notification preference.",
        );
      }
    } catch (error) {
      setEmailNotifications(!nextValue);
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to update notification preference.",
      );
    } finally {
      setSavingNotificationPreference(false);
    }
  }

  return (
    <div className="profile-page client-profile-page">
      <style>{`
        .client-profile-page .profile-avatar {
          overflow: hidden;
        }

        .client-profile-page .profile-avatar img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .client-profile-page .client-profile-toggle-copy {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #667085;
          font-family: var(--font-geist), var(--font-inter), Inter, sans-serif;
          font-size: 16px;
          line-height: 24px;
        }

        .client-profile-page .client-profile-company {
          color: #667085;
        }
      `}</style>

      <header className="profile-page-header">
        <h1 className="profile-page-title">Profile Details</h1>

        <Link
          href="/client-portal/profile/edit"
          className="profile-outline-button"
        >
          Edit Profile
        </Link>
      </header>

      <section className="profile-content">
        <div className="profile-identity">
          <div
            className="profile-avatar"
            aria-label={fullName}
            title={fullName}
          >
            {safeProfile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={safeProfile.avatar} alt="" />
            ) : (
              <>
                {(safeProfile.firstName[0] ?? fullName[0] ?? "C").toUpperCase()}
                {(safeProfile.lastName[0] ?? "").toUpperCase()}
              </>
            )}
          </div>

          <div className="profile-identity-copy">
            <h2>{fullName}</h2>
            <p>
              {safeProfile.jobTitle || roleLabel}
              {safeProfile.company ? (
                <span className="client-profile-company">
                  {" "}
                  · {safeProfile.company}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <section className="profile-section">
          <h3 className="profile-section-title">Personal Information</h3>

          <div className="profile-info-grid">
            <ProfileValue label="Email Address" value={safeProfile.email} />
            <ProfileValue label="Phone Number" value={safeProfile.phone} />
            <ProfileValue label="Job Title" value={safeProfile.jobTitle} />
            <ProfileValue label="Company" value={safeProfile.company} />
          </div>
        </section>

        <section className="profile-section">
          <h3 className="profile-section-title">Account Security</h3>

          <div className="profile-security-grid">
            <div className="profile-security-item">
              <span className="profile-value-label">Current Password</span>

              <div className="profile-password-value">
                <span>************</span>
                <Eye size={20} />
              </div>
            </div>

            <div className="profile-security-item">
              <span className="profile-value-label">Role</span>
              <span className="profile-value-text">{roleLabel}</span>
            </div>

            <div className="profile-security-item">
              <span className="profile-value-label">Email Notifications</span>

              <div className="client-profile-toggle-copy">
                <button
                  type="button"
                  role="switch"
                  aria-checked={emailNotifications}
                  aria-label="Email notifications"
                  disabled={savingNotificationPreference}
                  className={
                    emailNotifications
                      ? "profile-toggle profile-toggle-on"
                      : "profile-toggle"
                  }
                  onClick={() => void toggleEmailNotifications()}
                >
                  <span />
                </button>

                <span>{emailNotifications ? "Enabled" : "Disabled"}</span>
              </div>
            </div>
          </div>
        </section>
      </section>

      {notice ? (
        <StickyToast
          message={notice}
          kind="error"
          onDismiss={() => setNotice("")}
        />
      ) : null}
    </div>
  );
}

function ProfileValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="profile-value">
      <span className="profile-value-label">{label}</span>
      <span className="profile-value-text">{value || "Not set"}</span>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ProfileData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  timeZone: string;
  role: string;
  twoFactorEnabled: boolean;
};

export default function ProfileDetails({
  profile,
  activeSessions,
}: {
  profile: ProfileData;
  activeSessions: number;
}) {
  const router = useRouter();
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    profile.twoFactorEnabled,
  );

  return (
    <div className="profile-page">
      <header className="profile-page-header">
        <h1 className="profile-page-title">Profile Details</h1>

        <Link href="/profile/edit" className="profile-outline-button">
          Edit Profile
        </Link>
      </header>

      <section className="profile-content">
        <div className="profile-identity">
          <div className="profile-avatar" aria-label={fullName || "Profile User"}>
            {(profile.firstName[0] ?? "A").toUpperCase()}
            {(profile.lastName[0] ?? "D").toUpperCase()}
          </div>

          <div className="profile-identity-copy">
            <h2>{fullName || "Profile User"}</h2>
            <p>{profile.role}</p>
          </div>
        </div>

        <section className="profile-section">
          <h3 className="profile-section-title">Personal Information</h3>

          <div className="profile-info-grid">
            <ProfileValue label="Email Address" value={profile.email} />
            <ProfileValue label="Phone Number" value={profile.phone} />
            <ProfileValue label="Job Title" value={profile.jobTitle} />
            <ProfileValue label="Time Zone" value={profile.timeZone} />
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
              <span className="profile-value-label">Active sessions</span>

              <div className="profile-session-row">
                <span>{activeSessions} Devices</span>

                <button
                  type="button"
                  className="profile-session-button"
                  onClick={async () => {
                    await fetch("/api/auth/logout-all", {
                      method: "POST",
                    });
                    router.push("/login");
                    router.refresh();
                  }}
                >
                  Logout For All Sessions
                </button>
              </div>
            </div>

            <div className="profile-security-item">
              <span className="profile-value-label">
                Two-Factor Authentication
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={twoFactorEnabled}
                className={
                  twoFactorEnabled
                    ? "profile-toggle profile-toggle-on"
                    : "profile-toggle"
                }
                onClick={async () => {
                  const nextValue = !twoFactorEnabled;
                  setTwoFactorEnabled(nextValue);

                  await fetch("/api/profile", {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      firstName: profile.firstName,
                      lastName: profile.lastName,
                      email: profile.email,
                      phone: profile.phone,
                      jobTitle: profile.jobTitle,
                      timeZone: profile.timeZone,
                      twoFactorEnabled: nextValue,
                    }),
                  });
                }}
              >
                <span />
              </button>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}

function ProfileValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-value">
      <span className="profile-value-label">{label}</span>
      <span className="profile-value-text">{value || "-"}</span>
    </div>
  );
}

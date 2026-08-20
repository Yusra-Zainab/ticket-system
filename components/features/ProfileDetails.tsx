"use client";

import Link from "next/link";
import { Eye } from "lucide-react";

const profile = {
  firstName: "Ahmed",
  lastName: "Khan",
  email: "amasood@datapulsetechnologies.org",
  phone: "+353-5222-5669",
  jobTitle: "Project Coordinator",
  timeZone: "GMT+1 IST (Ireland)",
  role: "Admin",
  activeSessions: 2,
  twoFactorEnabled: true,
};

export default function ProfileDetails() {
  const fullName = `${profile.firstName} ${profile.lastName}`;

  return (
    <div className="profile-page">
      {/* =====================================================
          STICKY TITLE / ACTION
         ===================================================== */}
      <header className="profile-page-header">
        <h1 className="profile-page-title">Profile Details</h1>

        <Link href="/profile/edit" className="profile-outline-button">
          Edit Profile
        </Link>
      </header>

      {/* =====================================================
          PROFILE IDENTITY
         ===================================================== */}
      <section className="profile-content">
        <div className="profile-identity">
          <div className="profile-avatar" aria-label={fullName}>
            AK
          </div>

          <div className="profile-identity-copy">
            <h2>{fullName}</h2>
            <p>{profile.role}</p>
          </div>
        </div>

        {/* =================================================
            PERSONAL INFORMATION
           ================================================= */}
        <section className="profile-section">
          <h3 className="profile-section-title">Personal Information</h3>

          <div className="profile-info-grid">
            <ProfileValue label="Email Address" value={profile.email} />

            <ProfileValue label="Phone Number" value={profile.phone} />

            <ProfileValue label="Job Title" value={profile.jobTitle} />

            <ProfileValue label="Time Zone" value={profile.timeZone} />
          </div>
        </section>

        {/* =================================================
            ACCOUNT SECURITY
           ================================================= */}
        <section className="profile-section">
          <h3 className="profile-section-title">Account Security</h3>

          <div className="profile-security-grid">
            <div className="profile-security-item">
              <span className="profile-value-label">Current Password</span>

              <div className="profile-password-value">
                <span>••••••••••••</span>
                <Eye size={20} />
              </div>
            </div>

            <div className="profile-security-item">
              <span className="profile-value-label">Active sessions</span>

              <div className="profile-session-row">
                <span>{profile.activeSessions} Devices</span>

                <button
                  type="button"
                  className="profile-session-button"
                  onClick={() => {
                    // Connect this to your real
                    // session revoke endpoint later.
                    console.log("Logout from all sessions");
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
                aria-checked={profile.twoFactorEnabled}
                className="profile-toggle profile-toggle-on"
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

      <span className="profile-value-text">{value}</span>
    </div>
  );
}

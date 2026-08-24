"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ResourcePortalProfile } from "@/types/resourcePortal";

export default function ResourceProfileForm({ profile }: { profile: ResourcePortalProfile }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [jobTitle, setJobTitle] = useState(profile.jobTitle);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [emailNotifications, setEmailNotifications] = useState(profile.emailNotifications);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setSaving(true); setError(""); setSuccess("");
      const response = await fetch("/api/resource-portal/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName, lastName, phone, jobTitle, avatar, emailNotifications, ...(newPassword ? { newPassword } : {}) }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to save profile.");
      setNewPassword(""); setSuccess("Profile updated."); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save profile."); }
    finally { setSaving(false); }
  }

  return <form className="rp-profile-form" onSubmit={submit}>
    {error && <div className="rp-alert">{error}</div>}{success && <div className="rp-success">{success}</div>}
    <section className="rp-form-card"><h2>Personal information</h2><div className="rp-form-grid"><label><span>First name</span><input value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></label><label><span>Last name</span><input value={lastName} onChange={(e) => setLastName(e.target.value)} /></label><label><span>Phone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} /></label><label><span>Job title</span><input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} /></label><label className="rp-span-2"><span>Profile image URL</span><input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." /></label></div></section>
    <section className="rp-form-card"><h2>Account</h2><div className="rp-form-grid"><label><span>Work email</span><input value={profile.email} readOnly disabled /></label><label><span>Role</span><input value={profile.role.replaceAll("_", " ")} readOnly disabled /></label><label><span>New password</span><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to keep current password" /></label></div><label className="rp-checkbox"><input type="checkbox" checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} /><span>Email notifications</span></label></section>
    <div className="rp-form-actions"><button className="rp-primary-button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button></div>
  </form>;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

export default function NewClientTeamMemberForm() {
  const router = useRouter();
  const [values, setValues] = useState({ firstName: "", lastName: "", email: "", phone: "", jobTitle: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function field(name: keyof typeof values) {
    return { value: values[name], onChange: (event: React.ChangeEvent<HTMLInputElement>) => setValues((current) => ({ ...current, [name]: event.target.value })) };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setSaving(true); setError("");
      const response = await fetch("/api/client-portal/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to add team member.");
      router.push("/client/team"); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to add team member."); }
    finally { setSaving(false); }
  }

  return <div className="cp-ticket-form-layout"><aside className="cp-stepper"><div className="cp-step"><span>01</span><div><strong>Basic information</strong><small>Name and contact information</small></div></div><div className="cp-step"><span>02</span><div><strong>Portal access</strong><small>Client access is fixed</small></div></div><div className="cp-step"><span>03</span><div><strong>Invite</strong><small>Password setup email</small></div></div></aside><form className="cp-ticket-form" onSubmit={submit}>{error && <div className="cp-alert">{error}</div>}<section className="cp-form-card"><h2>Team member details</h2><div className="cp-form-grid"><label><span>First name *</span><input {...field("firstName")} required /></label><label><span>Last name</span><input {...field("lastName")} /></label><label><span>Email *</span><input type="email" {...field("email")} required /></label><label><span>Phone</span><input {...field("phone")} /></label><label className="cp-span-2"><span>Job title</span><input {...field("jobTitle")} /></label></div></section><section className="cp-form-card"><h2>Access</h2><div className="cp-readonly-panel"><strong>Client Portal</strong><p>This member can access the same client company projects and tickets. They cannot change roles, project settings, resource assignments, internal priority ordering, or staff-only comments.</p></div></section><div className="cp-form-actions"><button type="button" className="cp-secondary-button" onClick={() => router.back()}>Cancel</button><button type="submit" className="cp-primary-button" disabled={saving}><Send size={18} />{saving ? "Creating..." : "Create & invite"}</button></div></form></div>;
}

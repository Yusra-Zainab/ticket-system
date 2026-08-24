"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Link2, Save, Send, TicketCheck } from "lucide-react";
import type { ResourcePortalProject, ResourcePortalTicket, ResourceTicketType } from "@/types/resourcePortal";

const ticketTypes: ResourceTicketType[] = [
  "Bug", "Task", "Change Request", "New Feature", "Feedback", "Support Request",
  "UI/UX Issue", "Content Update", "Technical Issue", "Testing / QA", "Maintenance",
  "Urgent Fix", "System Down",
];

export default function ResourceTicketForm({
  projects,
  initialTicket,
  initialProjectId = "",
}: {
  projects: ResourcePortalProject[];
  initialTicket?: ResourcePortalTicket;
  initialProjectId?: string;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(initialTicket?.projectId || initialProjectId);
  const [title, setTitle] = useState(initialTicket?.title === "Untitled ticket" ? "" : initialTicket?.title || "");
  const [description, setDescription] = useState(initialTicket?.description || "");
  const [type, setType] = useState<ResourceTicketType>(initialTicket?.type || "Task");
  const [dueDate, setDueDate] = useState(initialTicket?.dueDate || "");
  const [linksText, setLinksText] = useState((initialTicket?.links || []).join("\n"));
  const [files, setFiles] = useState<File[]>([]);
  const [selfAssign, setSelfAssign] = useState(false);
  const [saving, setSaving] = useState<"DRAFT" | "OPEN" | null>(null);
  const [error, setError] = useState("");

  const selectedProject = useMemo(() => projects.find((project) => project.id === projectId), [projects, projectId]);
  const links = linksText.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);

  async function save(lifecycle: "DRAFT" | "OPEN") {
    try {
      setSaving(lifecycle);
      setError("");
      const response = await fetch("/api/resource-portal/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initialTicket?.id, lifecycle, projectId, title, description, type, dueDate, urls: links, selfAssign }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; id?: string };
      if (!response.ok) throw new Error(body.error || "Unable to save ticket.");
      const ticketId = body.id || initialTicket?.id;
      if (!ticketId) throw new Error("The ticket was saved without an id.");

      if (files.length) {
        const upload = new FormData();
        files.forEach((file) => upload.append("files", file));
        const attachmentResponse = await fetch(`/api/resource-portal/tickets/${encodeURIComponent(ticketId)}/attachments`, { method: "POST", body: upload });
        const attachmentBody = await attachmentResponse.json().catch(() => ({})) as { error?: string };
        if (!attachmentResponse.ok) throw new Error(attachmentBody.error || "Ticket saved, but attachments could not be uploaded.");
      }

      router.push(lifecycle === "DRAFT" ? "/resource/tickets/drafts" : `/resource/tickets/${encodeURIComponent(ticketId)}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save ticket.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="rp-ticket-form-layout">
      <aside className="rp-stepper">
        {[
          ["01", "Project", selectedProject?.name || "Choose an assigned project"],
          ["02", "Ticket details", title || "Title and type"],
          ["03", "Description", description ? "Description added" : "Describe the work"],
          ["04", "Files & links", `${files.length} file(s), ${links.length} link(s)`],
          ["05", "Review", "Save draft or submit"],
        ].map(([number, label, text]) => (
          <div className="rp-step" key={number}><span>{number}</span><div><strong>{label}</strong><small>{text}</small></div></div>
        ))}
      </aside>

      <form className="rp-ticket-form" onSubmit={(event) => { event.preventDefault(); void save("OPEN"); }}>
        {error && <div className="rp-alert">{error}</div>}
        <section className="rp-form-card">
          <div className="rp-card-title"><TicketCheck size={22} /><div><h2>Project & ticket details</h2><p>Resources can create tickets only in projects assigned to them.</p></div></div>
          <div className="rp-form-grid">
            <label><span>Project *</span><select value={projectId} onChange={(e) => { setProjectId(e.target.value); setSelfAssign(false); }} required><option value="">Select assigned project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <label><span>Ticket type</span><select value={type} onChange={(e) => setType(e.target.value as ResourceTicketType)}>{ticketTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="rp-span-2"><span>Title *</span><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} placeholder="Briefly describe the work" required /></label>
            <label><span>Due date</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
            {selectedProject?.allowSelfAssign ? <label className="rp-checkbox"><input type="checkbox" checked={selfAssign} onChange={(e) => setSelfAssign(e.target.checked)} /><span>Assign this ticket to me</span></label> : null}
          </div>
        </section>

        <section className="rp-form-card"><h2>Description</h2><label><span>Details</span><textarea rows={8} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add context, expected result, steps, links, or acceptance criteria." /></label></section>
        <section className="rp-form-card"><div className="rp-card-title"><FileUp size={22} /><div><h2>Attachments</h2><p>Maximum 10 MB per file.</p></div></div><label className="rp-file-drop"><input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} /><FileUp size={24} /><strong>Choose files</strong><span>{files.length ? files.map((file) => file.name).join(", ") : "No new files selected"}</span></label></section>
        <section className="rp-form-card"><div className="rp-card-title"><Link2 size={22} /><div><h2>Reference links</h2><p>One URL per line.</p></div></div><textarea rows={5} value={linksText} onChange={(e) => setLinksText(e.target.value)} placeholder="https://..." /></section>
        <div className="rp-form-actions"><button type="button" className="rp-secondary-button" onClick={() => void save("DRAFT")} disabled={Boolean(saving)}><Save size={18} />{saving === "DRAFT" ? "Saving..." : "Save Draft"}</button><button type="submit" className="rp-primary-button" disabled={Boolean(saving)}><Send size={18} />{saving === "OPEN" ? "Submitting..." : initialTicket ? "Submit Draft" : "Submit Ticket"}</button></div>
      </form>
    </div>
  );
}

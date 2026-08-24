"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Link2, MessageSquare, Pencil, UserCheck } from "lucide-react";
import type { ResourcePortalTicket, ResourceTicketStatus } from "@/types/resourcePortal";

const resourceStatuses: Array<{ value: ResourceTicketStatus; label: string }> = [
  { value: "Active", label: "In Progress" },
  { value: "Blocked", label: "Blocked" },
  { value: "Awaiting", label: "Awaiting" },
  { value: "QA", label: "In Review" },
  { value: "Validation", label: "Validation" },
];

export default function ResourceTicketDetail({ ticket }: { ticket: ResourcePortalTicket }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [link, setLink] = useState("");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [dueDate, setDueDate] = useState(ticket.dueDate || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function patch(body: Record<string, unknown>) {
    try {
      setBusy(true); setError("");
      const response = await fetch(`/api/resource-portal/tickets/${encodeURIComponent(ticket.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to update ticket.");
      router.refresh(); return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to update ticket."); return false; }
    finally { setBusy(false); }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    try {
      setBusy(true); setError("");
      const data = new FormData(); Array.from(files).forEach((file) => data.append("files", file));
      const response = await fetch(`/api/resource-portal/tickets/${encodeURIComponent(ticket.id)}/attachments`, { method: "POST", body: data });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to upload files.");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to upload files."); }
    finally { setBusy(false); }
  }

  return (
    <div className="rp-ticket-detail">
      {error && <div className="rp-alert">{error}</div>}
      <section className="rp-ticket-summary">
        <div className="rp-ticket-meta-grid"><div><span>Status</span><strong className="rp-badge">{ticket.status}</strong></div><div><span>Priority</span><strong>{ticket.priority}</strong></div><div><span>Project</span><strong>{ticket.project}</strong></div><div><span>Assigned to</span><strong>{ticket.assignee}</strong></div><div><span>Reporter</span><strong>{ticket.reporter}</strong></div><div><span>Due date</span><strong>{ticket.dueDate || "Not set"}</strong></div></div>
        <div className="rp-ticket-actions">
          {ticket.permissions?.canEditDetails && <button type="button" onClick={() => setEditing((value) => !value)}><Pencil size={17} />Edit ticket</button>}
          {ticket.permissions?.canSelfAssign && <button type="button" disabled={busy} onClick={() => void patch({ action: "selfAssign" })}><UserCheck size={17} />Assign to me</button>}
        </div>
        {ticket.permissions?.canChangeStatus && <div className="rp-status-actions"><span>Update status</span>{resourceStatuses.map((item) => <button key={item.value} disabled={busy || ticket.status === item.value} onClick={() => void patch({ action: "status", status: item.value })}>{item.label}</button>)}</div>}
      </section>

      {editing && <section className="rp-form-card"><h2>Edit ticket</h2><div className="rp-form-grid"><label className="rp-span-2"><span>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} /></label><label className="rp-span-2"><span>Description</span><textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} /></label><label><span>Due date</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label></div><div className="rp-inline-actions"><button className="rp-secondary-button" type="button" onClick={() => setEditing(false)}>Cancel</button><button className="rp-primary-button" type="button" disabled={busy} onClick={async () => { if (await patch({ action: "edit", title, description, dueDate })) setEditing(false); }}>Save changes</button></div></section>}

      <div className="rp-detail-columns"><div className="rp-detail-main"><section className="rp-form-card"><h2>Description</h2><p className="rp-description">{ticket.description || "No description provided."}</p></section><section className="rp-form-card"><div className="rp-card-title"><MessageSquare size={20} /><div><h2>Conversation</h2><p>Comments posted here are public to the client.</p></div></div><div className="rp-comments">{ticket.comments?.map((item) => <article key={item.id}><strong>{item.user}</strong><time>{item.createdAt}</time><p>{item.content}</p></article>)}{!ticket.comments?.length && <p className="rp-muted">No comments yet.</p>}</div>{ticket.permissions?.canComment && <div className="rp-comment-box"><textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment..." /><button className="rp-primary-button" disabled={busy || !comment.trim()} onClick={async () => { if (await patch({ action: "comment", content: comment })) setComment(""); }}>Send comment</button></div>}</section></div>
        <aside className="rp-detail-side"><section className="rp-form-card"><div className="rp-card-title"><FileUp size={20} /><div><h2>Attachments</h2><p>{ticket.attachments.length} file(s)</p></div></div><div className="rp-file-list">{ticket.attachments.map((file) => <a key={file.id} href={file.url} target="_blank" rel="noreferrer"><strong>{file.name}</strong><span>{Math.ceil(file.size / 1024)} KB</span></a>)}</div>{ticket.permissions?.canUpload && <label className="rp-upload-button"><input type="file" multiple disabled={busy} onChange={(e) => void upload(e.target.files)} /><FileUp size={17} />Upload files</label>}</section>
          <section className="rp-form-card"><div className="rp-card-title"><Link2 size={20} /><div><h2>Links</h2><p>Add references without changing ticket assignment or priority.</p></div></div><div className="rp-link-list">{ticket.links.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">{url}</a>)}</div>{ticket.permissions?.canAddLink && <div className="rp-link-add"><input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." /><button disabled={busy || !link.trim()} onClick={async () => { if (await patch({ action: "addLink", url: link })) setLink(""); }}>Add</button></div>}</section>
          <section className="rp-form-card"><h2>Activity</h2><div className="rp-activity">{ticket.activities?.map((item) => <div key={item.id}><strong>{item.action}</strong><span>{item.user} · {item.createdAt}</span></div>)}</div></section></aside></div>
    </div>
  );
}

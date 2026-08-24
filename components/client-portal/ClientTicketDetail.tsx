"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, FileUp, MessageSquare, Pencil, RotateCcw, XCircle } from "lucide-react";
import type { ClientPortalTicket } from "@/types/clientPortal";

export default function ClientTicketDetail({ ticket, currentUserId }: { ticket: ClientPortalTicket; currentUserId: number }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [dueDate, setDueDate] = useState(ticket.dueDate || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const watching = ticket.watcherIds.includes(currentUserId);

  async function patch(body: Record<string, unknown>) {
    try {
      setBusy(true); setError("");
      const response = await fetch(`/api/client-portal/tickets/${encodeURIComponent(ticket.id)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to update ticket.");
      router.refresh();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update ticket.");
      return false;
    } finally { setBusy(false); }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    try {
      setBusy(true); setError("");
      const data = new FormData(); Array.from(files).forEach((file) => data.append("files", file));
      const response = await fetch(`/api/client-portal/tickets/${encodeURIComponent(ticket.id)}/attachments`, { method: "POST", body: data });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to upload files.");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to upload files."); }
    finally { setBusy(false); }
  }

  return (
    <div className="cp-ticket-detail">
      {error && <div className="cp-alert">{error}</div>}
      <section className="cp-ticket-summary">
        <div className="cp-ticket-meta-grid">
          <div><span>Status</span><strong className="cp-badge">{ticket.status}</strong></div>
          <div><span>Priority</span><strong>{ticket.priority}</strong></div>
          <div><span>Project</span><strong>{ticket.project}</strong></div>
          <div><span>Assigned to</span><strong>{ticket.assignee}</strong></div>
          <div><span>Reporter</span><strong>{ticket.reporter}</strong></div>
          <div><span>Due date</span><strong>{ticket.dueDate || "Not set"}</strong></div>
        </div>
        <div className="cp-ticket-actions">
          {ticket.permissions?.canEditDetails && <button type="button" onClick={() => setEditing((value) => !value)}><Pencil size={17} />Edit ticket</button>}
          {ticket.permissions?.canWatch && <button type="button" disabled={busy} onClick={() => void patch({ action: "watch" })}>{watching ? <EyeOff size={17} /> : <Eye size={17} />}{watching ? "Unwatch" : "Watch"}</button>}
          {ticket.permissions?.canReopen && <button type="button" disabled={busy} onClick={() => void patch({ action: "reopen" })}><RotateCcw size={17} />Reopen</button>}
          {ticket.permissions?.canClose && <button type="button" disabled={busy} onClick={() => void patch({ action: "close" })}><XCircle size={17} />Close ticket</button>}
        </div>
      </section>

      {editing && <section className="cp-form-card"><h2>Edit ticket</h2><div className="cp-form-grid"><label className="cp-span-2"><span>Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} /></label><label className="cp-span-2"><span>Description</span><textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} /></label><label><span>Due date</span><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label></div><div className="cp-inline-actions"><button className="cp-secondary-button" type="button" onClick={() => setEditing(false)}>Cancel</button><button className="cp-primary-button" type="button" disabled={busy} onClick={async () => { if (await patch({ action: "edit", title, description, dueDate })) setEditing(false); }}>Save changes</button></div></section>}

      <div className="cp-detail-columns">
        <div className="cp-detail-main">
          <section className="cp-form-card"><h2>Description</h2><p className="cp-description">{ticket.description || "No description provided."}</p></section>
          <section className="cp-form-card"><div className="cp-card-title"><MessageSquare size={20} /><div><h2>Conversation</h2><p>Public replies shared with your support team.</p></div></div><div className="cp-comments">{ticket.comments?.map((item) => <article key={item.id}><strong>{item.user}</strong><time>{item.createdAt}</time><p>{item.content}</p></article>)}{!ticket.comments?.length && <p className="cp-muted">No comments yet.</p>}</div>{ticket.permissions?.canComment && <div className="cp-comment-box"><textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a reply..." /><button className="cp-primary-button" disabled={busy || !comment.trim()} onClick={async () => { if (await patch({ action: "comment", content: comment })) setComment(""); }}>Send reply</button></div>}</section>
        </div>
        <aside className="cp-detail-side">
          <section className="cp-form-card"><div className="cp-card-title"><FileUp size={20} /><div><h2>Attachments</h2><p>{ticket.attachments.length} file(s)</p></div></div><div className="cp-file-list">{ticket.attachments.map((file) => <a key={file.id} href={file.url} target="_blank" rel="noreferrer"><strong>{file.name}</strong><span>{Math.ceil(file.size / 1024)} KB</span></a>)}</div>{ticket.permissions?.canUpload && <label className="cp-upload-button"><input type="file" multiple disabled={busy} onChange={(e) => void upload(e.target.files)} /><FileUp size={17} />Upload files</label>}</section>
          <section className="cp-form-card"><h2>Links</h2>{ticket.links.length ? <div className="cp-link-list">{ticket.links.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">{url}</a>)}</div> : <p className="cp-muted">No links added.</p>}</section>
          <section className="cp-form-card"><h2>Activity</h2><div className="cp-activity">{ticket.activities?.map((item) => <div key={item.id}><strong>{item.action}</strong><span>{item.user} · {item.createdAt}</span></div>)}</div></section>
        </aside>
      </div>
    </div>
  );
}

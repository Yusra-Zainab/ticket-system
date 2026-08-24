"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronDown, ChevronLeft, ExternalLink, File, FileImage, FileText, Link2, Paperclip, Plus, Send, Upload, X } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn, formatDate, sanitizeRichText } from "@/lib/utils";
import type { Status, Ticket, TicketAttachment } from "@/types";

type DetailTab = "chat" | "media";
export type UserRole = "Admin" | "Project Manager" | "Developer" | "Client";
type Action = "Change Status" | "Assign Resource" | "Change Priority" | "Upload File" | "Add Comment" | "Mark Resolved" | "Edit Ticket Details";
type Comment = { id: number; user: string; time: string; text: string; attachments?: string[] };
type MediaType = "Photos and videos" | "Documents" | "Links";
type MediaItem = { id: string; type: MediaType; title: string; meta: string; date: string; url: string };
type Priority = (typeof priorities)[number];
type PendingChange = { message: string; apply: () => void };

const roleActions: Record<UserRole, Action[]> = {
  Admin: ["Change Status", "Assign Resource", "Change Priority", "Upload File", "Add Comment", "Mark Resolved"],
  "Project Manager": ["Change Status", "Assign Resource", "Change Priority", "Upload File", "Add Comment"],
  Developer: ["Change Status", "Upload File", "Add Comment", "Mark Resolved"],
  Client: ["Upload File", "Add Comment"],
};
const statuses: Status[] = ["Open", "In Progress", "Blocked", "Ready for Review", "Closed"];
const priorities = ["Critical", "High", "Medium", "Low"] as const;
const priorityNumber = { Critical: 1, High: 2, Medium: 3, Low: 4 };
const priorityColors: Record<Priority, string> = { Critical: "bg-red-600 text-white ring-red-700", High: "bg-orange-600 text-white ring-orange-700", Medium: "bg-yellow-600 text-white ring-yellow-700", Low: "bg-green-600 text-white ring-green-700" };
const ticketTypeColors: Record<string, string> = {
  Bug: "bg-red-50 text-red-700 ring-red-200",
  Feedback: "bg-orange-50 text-orange-700 ring-orange-200",
  "Technical Issue": "bg-amber-50 text-amber-700 ring-amber-200",
  "New Feature": "bg-violet-50 text-violet-700 ring-violet-200",
  Task: "bg-blue-50 text-blue-700 ring-blue-200",
  "Support Request": "bg-teal-50 text-teal-700 ring-teal-200",
  "UI/UX Issue": "bg-pink-50 text-pink-700 ring-pink-200",
};
const asString = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const buildTicketMedia = (ticket: Ticket): MediaItem[] => {
  const data = (ticket.formData ?? {}) as Record<string, unknown>;
  const attachments = Array.isArray(data.attachments)
    ? data.attachments.filter(
        (item): item is TicketAttachment =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as TicketAttachment).id === "string" &&
          typeof (item as TicketAttachment).name === "string" &&
          typeof (item as TicketAttachment).url === "string",
      )
    : [];
  const urls = asStringArray(data.urls);
  return [
    ...attachments.map((attachment) => ({
      id: attachment.id,
      type: attachment.mimeType.startsWith("image/") || attachment.mimeType.startsWith("video/")
        ? ("Photos and videos" as MediaType)
        : ("Documents" as MediaType),
      title: attachment.name,
      meta: `${Math.max(1, Math.round(attachment.size / 1024))} KB`,
      date: formatDate(attachment.uploadedAt),
      url: attachment.url,
    })),
    ...urls.map((url, index) => ({
      id: `url-${ticket.id}-${index}`,
      type: "Links" as MediaType,
      title: url,
      meta: url,
      date: formatDate(ticket.created),
      url,
    })),
  ];
};
const readTicketActivities = (ticket: Ticket) => {
  const data = (ticket.formData ?? {}) as Record<string, unknown>;
  const stored = Array.isArray(data.activity)
    ? data.activity.filter((item): item is string => typeof item === "string")
    : [];

  return stored.length
    ? stored
    : [`Ticket loaded from database: ${ticket.id}`];
};
const readTicketComments = (ticket: Ticket): Comment[] => {
  const data = (ticket.formData ?? {}) as Record<string, unknown>;
  const stored = Array.isArray(data.comments) ? data.comments : [];

  return stored
    .filter(
      (item): item is Comment =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Comment).id === "number" &&
        typeof (item as Comment).user === "string" &&
        typeof (item as Comment).time === "string" &&
        typeof (item as Comment).text === "string" &&
        ((item as Comment).attachments === undefined ||
          Array.isArray((item as Comment).attachments)),
    )
    .map((item) => ({
      ...item,
      attachments: Array.isArray(item.attachments)
        ? item.attachments.filter(
            (attachment): attachment is string => typeof attachment === "string",
          )
        : undefined,
    }));
};
const createActivityEntry = (text: string) =>
  `${new Date().toLocaleString()} · ${text}`;

export default function TicketDetailsView({
  ticket,
  currentRole = "Admin",
  resourceOptions = [],
}: {
  ticket: Ticket;
  currentRole?: UserRole;
  resourceOptions?: string[];
}) {
  const data = (ticket.formData ?? {}) as Record<string, unknown>;
  const persistedTitle = asString(data.title, ticket.title);
  const persistedDescription = asString(data.description, ticket.description);
  const persistedStatus = ticket.status === "Critical" ? "Open" : ticket.status;
  const persistedPriority =
    ticket.priority === 1
      ? "Critical"
      : ticket.priority === 2
        ? "High"
        : ticket.priority === 3
          ? "Medium"
          : "Low";
  const persistedAssignee = asString(data.assignedTo, ticket.assignedTo);
  const persistedProject = asString(data.project, ticket.project);
  const persistedModule = asString(data.module, "Not selected");
  const persistedSubModule = asString(data.subModule, "Not selected");
  const persistedType = asString(data.type, "Not set");
  const persistedCreatedBy = asString(data.createdBy, ticket.reporter || "System");
  const persistedDueDate = asString(data.dueDate, ticket.dueDate);
  const persistedEstimatedTime = asString(data.estimatedTime, "Not set");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<DetailTab>("media");
  const [moreOpen, setMoreOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<Action>();
  const [title, setTitle] = useState(persistedTitle);
  const [titleDraft, setTitleDraft] = useState(title);
  const [description, setDescription] = useState(persistedDescription);
  const [descriptionDraft, setDescriptionDraft] = useState(description);
  const [status, setStatus] = useState<Status>(persistedStatus);
  const [priority, setPriority] = useState<(typeof priorities)[number]>(persistedPriority);
  const [assignee, setAssignee] = useState(persistedAssignee);
  const [comments, setComments] = useState<Comment[]>(() => readTicketComments(ticket));
  const [message, setMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);
  const [media, setMedia] = useState<MediaItem[]>(() => buildTicketMedia(ticket));
  const [storedFormData, setStoredFormData] = useState<Record<string, unknown>>(data);
  const [mediaModal, setMediaModal] = useState<MediaType>();
  const [pendingChange, setPendingChange] = useState<PendingChange>();
  const [notice, setNotice] = useState("");
  const [activities, setActivities] = useState<string[]>(() => readTicketActivities(ticket));
  const fileInput = useRef<HTMLInputElement>(null);
  const commentInput = useRef<HTMLTextAreaElement>(null);
  const actions = roleActions[currentRole];
  const availableResources = resourceOptions.length
    ? resourceOptions
    : persistedAssignee
      ? [persistedAssignee]
      : [];
  const visibleActions = actions.slice(0, 6);
  const overflowActions = useMemo(() => actions.slice(6), [actions]);
  const patchTicket = async (payload: Record<string, unknown>) => {
    const response = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      let message = "Unable to update ticket.";
      try {
        const error = await response.json();
        if (typeof error?.error === "string") message = error.error;
      } catch {
        // Ignore JSON parsing failures.
      }
      throw new Error(message);
    }
    return response.json() as Promise<Ticket>;
  };
  const persistActivity = async (
    text: string,
    payload: Record<string, unknown> = {},
  ) => {
    const nextActivities = [createActivityEntry(text), ...activities].slice(0, 50);
    const formDataPatch =
      payload.formData && typeof payload.formData === "object"
        ? (payload.formData as Record<string, unknown>)
        : {};
    const nextFormData = {
      ...storedFormData,
      ...formDataPatch,
      activity: nextActivities,
    };

    await patchTicket({
      ...payload,
      formData: nextFormData,
    });

    setStoredFormData(nextFormData);
    setActivities(nextActivities);
  };

  const selectAction = (action: Action) => {
    setMoreOpen(false);
    setActiveAction(action);
  };
  const handleFiles = (files: File[]) => {
    if (!files.length) return;
    const upload = async () => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file, file.name));
      const response = await fetch(`/api/tickets/${ticket.id}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Unable to upload files.");
      const data = (await response.json()) as { attachments?: TicketAttachment[] };
      const uploaded = data.attachments ?? [];
      setPendingFiles((items) => [...items, ...uploaded.map((item) => item.name)]);
      setMedia((items) => [
        ...uploaded.map((attachment) => ({
          id: attachment.id,
          type:
            attachment.mimeType.startsWith("image/") ||
            attachment.mimeType.startsWith("video/")
              ? ("Photos and videos" as const)
              : ("Documents" as const),
          title: attachment.name,
          meta: `${Math.max(1, Math.round(attachment.size / 1024))} KB`,
          date: formatDate(attachment.uploadedAt),
          url: attachment.url,
        })),
        ...items,
      ]);
      await persistActivity(
        uploaded.length === 1
          ? `File uploaded: ${uploaded[0].name}`
          : `${uploaded.length} files uploaded`,
      );
      setTab("media");
      setActiveAction(undefined);
    };
    void upload().catch((error) => {
      setNotice(error instanceof Error ? error.message : "Unable to upload files.");
    });
  };
  const addComment = async () => {
    if (!message.trim() && !pendingFiles.length) return;
    const nextComment = {
      id: Date.now(),
      user: assignee || persistedCreatedBy || "System",
      time: "Just now",
      text: message.trim() || "Shared attachments",
      attachments: pendingFiles,
    };
    const nextComments = [...comments, nextComment].slice(-100);
    setComments(nextComments);
    const author = assignee || persistedCreatedBy || "System";
    setMessage(""); setPendingFiles([]); setTab("chat"); setActiveAction(undefined);
    await persistActivity(`Comment added by ${author}`, {
      formData: {
        comments: nextComments,
      },
    });
  };

  return <div className="ticket-detail-page">
    <header className="sticky top-0 z-30 -mx-2 flex flex-col gap-5 border-b border-slate-100 bg-white/95 px-2 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between"><h1 className="detail-page-title">Ticket Details</h1><Link href="/tickets/new" className="button-primary"><Plus size={18} />Create a New Ticket</Link></header>
    <div className="mt-8 flex justify-end"><div className="detail-action-row">{visibleActions.map((action, index) => <button key={action} onClick={() => selectAction(action)} className={cn("detail-action-button", index > 2 && "hidden lg:inline-flex")}>{action}</button>)}{(visibleActions.length > 3 || overflowActions.length > 0) && <div className="relative"><button onClick={() => setMoreOpen((value) => !value)} className="detail-action-button" aria-expanded={moreOpen}>More<ChevronDown size={16} /></button>{moreOpen && <div className="detail-more-menu">{[...visibleActions.slice(3), ...overflowActions].map((action) => <button key={action} onClick={() => selectAction(action)}>{action}</button>)}</div>}</div>}</div></div>

    <div className={cn("mt-7 grid min-w-0", sidebarOpen ? "lg:grid-cols-[320px_minmax(0,1fr)]" : "lg:grid-cols-[56px_minmax(0,1fr)]")}>
      <aside className="detail-sidebar"><button onClick={() => setSidebarOpen((value) => !value)} className="detail-sidebar-toggle" aria-label={sidebarOpen ? "Collapse ticket details" : "Expand ticket details"}>{sidebarOpen ? <ChevronLeft /> : <ChevronDown className="-rotate-90" />}</button>{sidebarOpen && <dl className="space-y-4 pr-7"><Meta label="Status"><StatusBadge status={status} /></Meta><Meta label="Priority"><ChoiceTag label={priority} colors={priorityColors[priority]} /></Meta><Meta label="Ticket Type"><ChoiceTag label={persistedType} colors={ticketTypeColors[persistedType] ?? "bg-slate-50 text-slate-700 ring-slate-200"} /></Meta><Meta label="Project" value={persistedProject || "Not set"} /><Meta label="Module" value={persistedModule || "Not set"} /><Meta label="Sub Module" value={persistedSubModule || "Not set"} /><Meta label="Priority Number" value={`#${priorityNumber[priority]}`} /><Meta label="Assignee" value={assignee ? `${assignee} — Developer` : "Not set"} /><Meta label="Created By" value={persistedCreatedBy || "Not set"} /><Meta label="Due Date" value={formatDate(persistedDueDate)} /><Meta label="Estimated Time" value={persistedEstimatedTime || "Not set"} /><Meta label="Created Date" value={formatDate(ticket.created)} /><Meta label="Last Updated" value={formatDate(ticket.created)} /></dl>}</aside>
      <main className="min-w-0 px-0 pt-7 lg:px-8 lg:pt-0">
        <section><h2 className="detail-heading">{title}</h2><div className="mt-7 flex items-center gap-2"><h3 className="detail-subheading">Description</h3></div><div className="detail-body prose-ticket mt-2 w-full text-left" dangerouslySetInnerHTML={{ __html: sanitizeRichText(description).replace(/\n/g, "<br />") }} /></section>
        <section className="mt-7"><h3 className="detail-subheading">Attachments</h3><div className="mt-3 flex flex-wrap gap-3">{media.filter((item) => item.type !== "Links").slice(0, 5).map((item) => <AttachmentPreview key={item.id} label={item.title} href={item.url} />)}</div></section>
        <section className="mt-7"><h3 className="detail-subheading">URL Links</h3><div className="detail-body mt-3 space-y-3">{media.filter((item) => item.type === "Links").map((item) => <a key={item.id} className="block underline hover:text-sky-600" href={item.meta} target="_blank" rel="noreferrer">{item.title}: {item.meta}</a>)}</div></section>
        <section className="mt-7"><h3 className="detail-subheading mb-3">Comments</h3><div className="comments-panel"><div className="comments-tabs"><button onClick={() => setTab("chat")} className={tab === "chat" ? "active" : ""}>Chat Details</button><button onClick={() => setTab("media")} className={tab === "media" ? "active" : ""}>Media</button></div>{tab === "chat" ? <ChatArea comments={comments} message={message} setMessage={setMessage} pendingFiles={pendingFiles} onAttach={() => fileInput.current?.click()} onSend={addComment} inputRef={commentInput} /> : <MediaArea media={media} onSeeAll={setMediaModal} />}</div><input ref={fileInput} className="hidden" type="file" multiple onChange={(event) => { handleFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} /></section>
        <section className="mb-4 mt-8"><h3 className="detail-subheading">Activity History</h3><ul className="activity-summary mt-3">{activities.map((activity, index) => <li key={`${activity}-${index}`}>{activity}</li>)}</ul></section>
      </main>
    </div>
    {mediaModal && <MediaModal type={mediaModal} items={media.filter((item) => item.type === mediaModal)} onClose={() => setMediaModal(undefined)} />}
    {activeAction && <ActionModal action={activeAction} status={status} priority={priority} assignee={assignee} availableResources={availableResources} titleDraft={titleDraft} descriptionDraft={descriptionDraft} setTitleDraft={setTitleDraft} setDescriptionDraft={setDescriptionDraft} message={message} setMessage={setMessage} onClose={() => setActiveAction(undefined)} onUpload={() => fileInput.current?.click()} onComment={addComment} requestChange={(change) => { setActiveAction(undefined); setPendingChange(change); }} applyStatus={async (value) => { await persistActivity(`Status changed to ${value}`, { status: value }); setStatus(value); }} applyPriority={async (value) => { const priorityNumberValue = value === "Critical" ? 1 : value === "High" ? 2 : value === "Medium" ? 3 : 4; await persistActivity(`Priority changed to ${value}`, { priorityType: value, priorityNumber: priorityNumberValue }); setPriority(value); }} applyAssignee={async (value) => { await persistActivity(`Ticket assigned to ${value}`, { assignedTo: value }); setAssignee(value); }} applyDetails={async () => { const nextTitle = titleDraft.trim() || title; const nextDescription = descriptionDraft.trim() || description; await persistActivity("Ticket details updated", { title: nextTitle, description: nextDescription, formData: { title: nextTitle, description: nextDescription } }); setTitle(nextTitle); setDescription(nextDescription); }} />}
    {pendingChange && <ConfirmationModal message={pendingChange.message} onCancel={() => setPendingChange(undefined)} onConfirm={() => { pendingChange.apply(); setPendingChange(undefined); }} />}
    {notice && <div role="status" className="ticket-toast ticket-toast-error"><p className="text-sm font-medium">{notice}</p><button type="button" className="ml-auto" onClick={() => setNotice("")} aria-label="Dismiss"><X size={17} /></button></div>}
  </div>;
}

function ActionModal({ action, status, priority, assignee, availableResources, titleDraft, descriptionDraft, setTitleDraft, setDescriptionDraft, message, setMessage, onClose, onUpload, onComment, requestChange, applyStatus, applyPriority, applyAssignee, applyDetails }: { action: Action; status: Status; priority: Priority; assignee: string; availableResources: string[]; titleDraft: string; descriptionDraft: string; setTitleDraft: (value: string) => void; setDescriptionDraft: (value: string) => void; message: string; setMessage: (value: string) => void; onClose: () => void; onUpload: () => void; onComment: () => void; requestChange: (change: PendingChange) => void; applyStatus: (value: Status) => void; applyPriority: (value: Priority) => void; applyAssignee: (value: string) => void; applyDetails: () => void }) {
  const [statusDraft, setStatusDraft] = useState(status);
  const [priorityDraft, setPriorityDraft] = useState(priority);
  const [assigneeDraft, setAssigneeDraft] = useState(assignee);
  const confirm = (messageText: string, apply: () => void) => requestChange({ message: messageText, apply });
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div role="dialog" aria-modal="true" aria-labelledby="action-modal-title" className="ticket-modal !w-[620px]"><div className="flex items-center justify-between"><h2 id="action-modal-title" className="text-[1.65rem] font-bold text-slate-700">{action}</h2><button onClick={onClose} className="row-icon" aria-label="Close"><X /></button></div>
    {action === "Change Status" && <ChoiceGrid>{statuses.map((item) => <button key={item} onClick={() => setStatusDraft(item)} className={cn("flex items-center justify-center rounded-lg border px-3 py-2", statusDraft === item ? "border-sky-500 bg-sky-50" : "border-slate-200 hover:bg-slate-50")}><StatusBadge status={item} /></button>)}</ChoiceGrid>}
    {action === "Change Priority" && <ChoiceGrid>{priorities.map((item) => <button key={item} onClick={() => setPriorityDraft(item)} className={cn("flex items-center justify-center rounded-lg border px-3 py-2", priorityDraft === item ? "border-sky-500 bg-sky-50" : "border-slate-200 hover:bg-slate-50")}><ChoiceTag label={item} colors={priorityColors[item]} /></button>)}</ChoiceGrid>}
    {action === "Assign Resource" && <div className="mt-5 grid grid-cols-2 gap-2">{availableResources.map((item) => <button key={item} onClick={() => setAssigneeDraft(item)} className={cn("rounded-xl border px-4 py-3 text-left text-sm font-semibold", assigneeDraft === item ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-700 hover:bg-slate-50")}>{item}</button>)}</div>}
    {action === "Upload File" && <button onClick={onUpload} className="mt-5 grid w-full place-items-center gap-2 rounded-xl border-2 border-dashed border-sky-200 bg-sky-50 p-10 text-sm font-semibold text-sky-700"><Upload /><span>Choose files to upload</span></button>}
    {action === "Add Comment" && <textarea autoFocus rows={5} className="field mt-5 resize-none" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a comment..." />}
    {action === "Mark Resolved" && <p className="mt-5 text-base text-slate-600">This will mark the ticket as closed and update its activity history.</p>}
    {action === "Edit Ticket Details" && <div className="mt-5 space-y-4"><label className="block"><span className="mb-2 block font-bold text-slate-700">Ticket title</span><input maxLength={200} className="field" value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} /></label><label className="block"><span className="mb-2 block font-bold text-slate-700">Description</span><textarea autoFocus rows={7} className="field resize-y" value={descriptionDraft} onChange={(event) => setDescriptionDraft(event.target.value)} /></label></div>}
    {action !== "Upload File" && <div className="mt-6 flex justify-end gap-2"><button className="rounded-xl border border-cyan-500 px-5 py-3 text-sm font-bold text-[#0284C7] hover:bg-[#E6F8FB]" onClick={onClose}>Cancel</button><button className="button-primary !px-6 !py-3" onClick={() => { if (action === "Change Status") confirm(`Change status to ${statusDraft}?`, () => applyStatus(statusDraft)); if (action === "Change Priority") confirm(`Change priority to ${priorityDraft}?`, () => applyPriority(priorityDraft)); if (action === "Assign Resource") confirm(`Assign this ticket to ${assigneeDraft}?`, () => applyAssignee(assigneeDraft)); if (action === "Add Comment") confirm("Add this comment?", onComment); if (action === "Mark Resolved") confirm("Mark this ticket as resolved?", () => applyStatus("Closed")); if (action === "Edit Ticket Details") confirm("Save the changes to this ticket?", applyDetails); }}>Save</button></div>}
  </div></div>;
}
function ConfirmationModal({ message, onCancel, onConfirm }: { message: string; onCancel: () => void; onConfirm: () => void }) { return <div className="modal-backdrop"><div role="alertdialog" aria-modal="true" aria-labelledby="change-confirmation-title" className="ticket-modal !w-[390px] !p-5"><h2 id="change-confirmation-title" className="text-[1.65rem] font-bold text-slate-700">Confirmation</h2><p className="mt-5 text-base font-semibold text-slate-700">{message}</p><div className="mt-5 flex items-center justify-between"><button className="rounded-xl border border-cyan-500 px-7 py-3 text-sm font-bold text-[#0284C7] hover:bg-[#E6F8FB]" onClick={onCancel}>No</button><button className="button-primary !px-7 !py-3" onClick={onConfirm}>Yes</button></div></div></div>; }
function ChoiceGrid({ children }: { children: React.ReactNode }) { return <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>; }
function ChoiceTag({ label, colors }: { label: string; colors: string }) { return <span className={cn("inline-flex min-w-24 justify-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset", colors)}>{label}</span>; }
function Meta({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) { return <div><dt className="detail-subheading">{label}</dt><dd className="detail-body mt-0.5">{children ?? value}</dd></div>; }
function AttachmentPreview({ label, href }: { label: string; href: string }) { return <a href={href} target="_blank" rel="noreferrer" className="group block w-28 text-left"><span className="grid h-16 place-items-center overflow-hidden rounded border border-slate-200 bg-gradient-to-br from-slate-50 to-sky-50"><FileImage className="text-sky-500" /></span><span className="mt-1 block truncate text-xs text-slate-500 group-hover:text-sky-600">{label}</span></a>; }
function ChatArea({ comments, message, setMessage, pendingFiles, onAttach, onSend, inputRef }: { comments: Comment[]; message: string; setMessage: (value: string) => void; pendingFiles: string[]; onAttach: () => void; onSend: () => void; inputRef: React.RefObject<HTMLTextAreaElement | null> }) { return <div className="chat-area"><div className="max-h-[430px] space-y-5 overflow-y-auto p-5">{comments.map((comment, index) => <div key={comment.id} className={cn("flex", index % 2 && "justify-end")}><div className={cn("max-w-[78%] rounded-2xl px-4 py-3", index % 2 ? "rounded-br-sm bg-[#E6F8FB]" : "rounded-bl-sm bg-slate-100")}><div className="mb-1 flex items-center gap-2"><strong className="text-sm text-[#101828]">{comment.user}</strong><time className="text-[11px] text-slate-400">{comment.time}</time></div><p className="detail-body !text-sm">{comment.text}</p>{comment.attachments?.map((file) => <span key={file} className="mt-2 flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-xs text-sky-700"><Paperclip size={14} />{file}</span>)}</div></div>)}</div><div className="border-t border-slate-200 p-3">{!!pendingFiles.length && <div className="mb-2 flex flex-wrap gap-2">{pendingFiles.map((file) => <span key={file} className="rounded bg-sky-50 px-2 py-1 text-xs text-sky-700">{file}</span>)}</div>}<div className="flex items-end gap-2"><button onClick={onAttach} className="row-icon" aria-label="Attach files"><Paperclip /></button><textarea ref={inputRef} value={message} onChange={(event) => setMessage(event.target.value)} rows={2} className="field resize-none" placeholder="Write a comment..." onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSend(); } }} /><button onClick={onSend} className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#0284C7] text-white hover:bg-[#0369a1]" aria-label="Send comment"><Send size={18} /></button></div></div></div>; }
function MediaArea({ media, onSeeAll }: { media: MediaItem[]; onSeeAll: (type: MediaType) => void }) { return <div className="space-y-5 p-4">{(["Photos and videos", "Documents", "Links"] as MediaType[]).map((type) => <MediaSection key={type} title={type} onSeeAll={() => onSeeAll(type)}>{type === "Photos and videos" ? <div className="flex gap-2 overflow-hidden">{media.filter((item) => item.type === type).slice(0, 5).map((item) => <a href={item.url} target="_blank" rel="noreferrer" title={item.title} key={item.id} className="grid size-20 shrink-0 place-items-center rounded border border-slate-200 bg-gradient-to-br from-sky-50 to-slate-100 hover:border-sky-300"><FileImage className="text-sky-500" /></a>)}</div> : media.filter((item) => item.type === type).slice(0, 2).map((item) => <MediaRow key={item.id} item={item} />)}</MediaSection>)}</div>; }
function MediaSection({ title, children, onSeeAll }: { title: string; children: React.ReactNode; onSeeAll: () => void }) { return <section><div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-semibold text-slate-700">{title}</h4><button onClick={onSeeAll} className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-500">See All<ArrowRight size={16} /></button></div>{children}</section>; }
function MediaRow({ item, showDate = false }: { item: MediaItem; showDate?: boolean }) { const icon = item.type === "Links" ? <Link2 className="text-slate-400" /> : item.title.endsWith(".pdf") ? <FileText className="text-red-500" /> : <File className="text-blue-600" />; return <a href={item.url} target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-sky-300 hover:bg-sky-50 last:mb-0"><span className="grid size-9 place-items-center">{icon}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm font-medium text-slate-700">{item.title}</strong><small className="block truncate text-slate-500">{item.meta}{showDate ? ` · ${item.date}` : ""}</small></span><ExternalLink size={16} className="text-slate-400" /></a>; }
function MediaModal({ type, items, onClose }: { type: MediaType; items: MediaItem[]; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div role="dialog" aria-modal="true" aria-labelledby="media-modal-title" className="ticket-modal !max-h-[85vh] !w-[680px] overflow-y-auto"><div className="sticky top-0 z-10 flex items-center justify-between bg-white pb-4"><div><h2 id="media-modal-title" className="detail-heading">All {type}</h2><p className="mt-1 text-sm text-slate-500">{items.length} item{items.length === 1 ? "" : "s"}, including upload dates</p></div><button onClick={onClose} className="row-icon" aria-label="Close media"><X /></button></div>{items.length ? <div className={type === "Photos and videos" ? "grid gap-3 sm:grid-cols-2" : "space-y-2"}>{items.map((item) => type === "Photos and videos" ? <a href={item.url} target="_blank" rel="noreferrer" key={item.id} className="group rounded-xl border border-slate-200 p-3 hover:border-sky-300 hover:bg-sky-50"><div className="grid h-32 place-items-center rounded-lg bg-gradient-to-br from-sky-50 to-slate-100"><FileImage className="text-sky-500" /></div><span className="mt-2 flex items-center justify-between gap-2"><span className="min-w-0"><strong className="block truncate text-sm font-medium text-slate-700">{item.title}</strong><time className="text-xs text-slate-500">{item.date}</time></span><ExternalLink size={16} className="shrink-0 text-slate-400" /></span></a> : <MediaRow key={item.id} item={item} showDate />)}</div> : <p className="py-10 text-center text-slate-500">No media in this category.</p>}</div></div>; }

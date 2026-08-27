"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  File,
  FileImage,
  FileText,
  Link2,
  Paperclip,
  Plus,
  Send,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { cn, sanitizeRichText } from "@/lib/utils";
import type {
  ClientPortalTicket,
  ClientPortalTicketAttachment,
  ClientTicketPriority,
  ClientTicketStatus,
  ClientTicketType,
} from "@/types/clientPortal";

type DetailTab = "chat" | "media";
type MediaType = "Photos and videos" | "Documents" | "Links";
type MediaItem = {
  id: string;
  type: MediaType;
  title: string;
  meta: string;
  date: string;
  url: string;
};

type Action =
  | "Edit Ticket Details"
  | "Watch Ticket"
  | "Unwatch Ticket"
  | "Upload File"
  | "Add Comment"
  | "Close Ticket"
  | "Reopen Ticket";

type PendingChange = {
  message: string;
  apply: () => void | Promise<void>;
};

const statusColors: Record<ClientTicketStatus, string> = {
  Open: "bg-violet-600 text-white ring-violet-700",
  Reviewed: "bg-slate-700 text-white ring-slate-800",
  Assigned: "bg-blue-600 text-white ring-blue-700",
  Active: "bg-teal-600 text-white ring-teal-700",
  Blocked: "bg-orange-600 text-white ring-orange-700",
  Awaiting: "bg-pink-600 text-white ring-pink-700",
  QA: "bg-green-600 text-white ring-green-700",
  Validation: "bg-blue-600 text-white ring-blue-700",
  Resolved: "bg-green-600 text-white ring-green-700",
  Closed: "bg-gray-700 text-white ring-gray-800",
  Reopened: "bg-red-600 text-white ring-red-700",
  Cancelled: "bg-gray-400 text-white ring-gray-500",
};

const priorityColors: Record<ClientTicketPriority, string> = {
  Critical: "bg-red-600 text-white ring-red-700",
  High: "bg-orange-600 text-white ring-orange-700",
  Medium: "bg-yellow-600 text-white ring-yellow-700",
  Low: "bg-green-600 text-white ring-green-700",
  "Not Assigned": "bg-gray-400 text-white ring-gray-500",
};

const typeColors: Record<ClientTicketType, string> = {
  Bug: "bg-red-50 text-red-700 ring-red-200",
  Task: "bg-blue-50 text-blue-700 ring-blue-200",
  "Change Request": "bg-violet-50 text-violet-700 ring-violet-200",
  "New Feature": "bg-purple-50 text-purple-700 ring-purple-200",
  Feedback: "bg-orange-50 text-orange-700 ring-orange-200",
  "Support Request": "bg-teal-50 text-teal-700 ring-teal-200",
  "UI/UX Issue": "bg-pink-50 text-pink-700 ring-pink-200",
  "Content Update": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Technical Issue": "bg-amber-50 text-amber-700 ring-amber-200",
  "Testing / QA": "bg-cyan-50 text-cyan-700 ring-cyan-200",
  Maintenance: "bg-slate-50 text-slate-700 ring-slate-200",
  "Urgent Fix": "bg-red-50 text-red-700 ring-red-200",
  "System Down": "bg-indigo-50 text-indigo-700 ring-indigo-200",
};

const priorityNumber: Record<ClientTicketPriority, number | string> = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4,
  "Not Assigned": "—",
};

function formatDate(value: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildMedia(ticket: ClientPortalTicket): MediaItem[] {
  return [
    ...ticket.attachments.map((attachment) => ({
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
    ...ticket.links.map((url, index) => ({
      id: `link-${ticket.id}-${index}`,
      type: "Links" as const,
      title: url.replace(/^https?:\/\//, ""),
      meta: url,
      date: formatDate(ticket.updatedAt || ticket.createdAt),
      url,
    })),
  ];
}

export default function ClientTicketDetail({
  ticket,
  currentUserId,
}: {
  ticket: ClientPortalTicket;
  currentUserId: number;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const commentInput = useRef<HTMLTextAreaElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<DetailTab>("media");
  const [moreOpen, setMoreOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [mediaModal, setMediaModal] = useState<MediaType>();
  const [pendingChange, setPendingChange] = useState<PendingChange>();
  const [message, setMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [dueDate, setDueDate] = useState(ticket.dueDate || "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const watching = ticket.watcherIds.includes(currentUserId);
  const media = useMemo(() => buildMedia(ticket), [ticket]);

  const actions = useMemo<Action[]>(() => {
    const items: Action[] = [];

    if (ticket.permissions?.canEditDetails) {
      items.push("Edit Ticket Details");
    }

    if (ticket.permissions?.canWatch) {
      items.push(watching ? "Unwatch Ticket" : "Watch Ticket");
    }

    if (ticket.permissions?.canUpload) {
      items.push("Upload File");
    }

    if (ticket.permissions?.canComment) {
      items.push("Add Comment");
    }

    if (ticket.permissions?.canClose) {
      items.push("Close Ticket");
    }

    if (ticket.permissions?.canReopen) {
      items.push("Reopen Ticket");
    }

    return items;
  }, [ticket.permissions, watching]);

  const visibleActions = actions.slice(0, 6);
  const overflowActions = actions.slice(6);

  async function patch(body: Record<string, unknown>) {
    try {
      setBusy(true);
      setNotice("");

      const response = await fetch(
        `/api/client-portal/tickets/${encodeURIComponent(ticket.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Unable to update ticket.");
      }

      router.refresh();
      return true;
    } catch (reason) {
      setNotice(
        reason instanceof Error ? reason.message : "Unable to update ticket.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function upload(files: File[]) {
    if (!files.length) return;

    try {
      setBusy(true);
      setNotice("");

      const formData = new FormData();
      files.forEach((file) => formData.append("files", file, file.name));

      const response = await fetch(
        `/api/client-portal/tickets/${encodeURIComponent(ticket.id)}/attachments`,
        {
          method: "POST",
          body: formData,
        },
      );

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        attachments?: Array<{ name?: string }>;
      };

      if (!response.ok) {
        throw new Error(result.error || "Unable to upload files.");
      }

      setPendingFiles((current) => [
        ...current,
        ...(result.attachments ?? [])
          .map((item) => item.name || "")
          .filter(Boolean),
      ]);
      setTab("media");
      router.refresh();
    } catch (reason) {
      setNotice(
        reason instanceof Error ? reason.message : "Unable to upload files.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendComment() {
    if (!message.trim()) return;

    const ok = await patch({
      action: "comment",
      content: message.trim(),
    });

    if (ok) {
      setMessage("");
      setPendingFiles([]);
      setTab("chat");
    }
  }

  function selectAction(action: Action) {
    setMoreOpen(false);

    if (action === "Edit Ticket Details") {
      setTitle(ticket.title);
      setDescription(ticket.description);
      setDueDate(ticket.dueDate || "");
      setEditOpen(true);
      return;
    }

    if (action === "Upload File") {
      fileInput.current?.click();
      return;
    }

    if (action === "Add Comment") {
      setTab("chat");
      window.setTimeout(() => commentInput.current?.focus(), 0);
      return;
    }

    if (action === "Watch Ticket" || action === "Unwatch Ticket") {
      setPendingChange({
        message: action === "Watch Ticket" ? "Watch this ticket?" : "Stop watching this ticket?",
        apply: async () => {
          await patch({ action: "watch" });
        },
      });
      return;
    }

    if (action === "Close Ticket") {
      setPendingChange({
        message: "Close this ticket?",
        apply: async () => {
          await patch({ action: "close" });
        },
      });
      return;
    }

    if (action === "Reopen Ticket") {
      setPendingChange({
        message: "Reopen this ticket?",
        apply: async () => {
          await patch({ action: "reopen" });
        },
      });
    }
  }

  return (
    <div className="ticket-detail-page">
      <header className="sticky top-0 z-30 -mx-2 flex flex-col gap-5 border-b border-slate-100 bg-white/95 px-2 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <h1 className="detail-page-title">Ticket Details</h1>

        <Link href="/client-portal/tickets/new" className="button-primary">
          <Plus size={18} />
          Create a New Ticket
        </Link>
      </header>

      {actions.length ? (
        <div className="mt-8 flex justify-end">
          <div className="detail-action-row">
            {visibleActions.map((action, index) => (
              <button
                key={action}
                type="button"
                disabled={busy}
                onClick={() => selectAction(action)}
                className={cn(
                  "detail-action-button",
                  index > 2 && "hidden lg:inline-flex",
                )}
              >
                {action}
              </button>
            ))}

            {(visibleActions.length > 3 || overflowActions.length > 0) ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMoreOpen((value) => !value)}
                  className="detail-action-button"
                  aria-expanded={moreOpen}
                >
                  More
                  <ChevronDown size={16} />
                </button>

                {moreOpen ? (
                  <div className="detail-more-menu">
                    {[...visibleActions.slice(3), ...overflowActions].map(
                      (action) => (
                        <button
                          type="button"
                          key={action}
                          onClick={() => selectAction(action)}
                        >
                          {action}
                        </button>
                      ),
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "mt-7 grid min-w-0",
          sidebarOpen
            ? "lg:grid-cols-[320px_minmax(0,1fr)]"
            : "lg:grid-cols-[56px_minmax(0,1fr)]",
        )}
      >
        <aside className="detail-sidebar">
          <button
            type="button"
            onClick={() => setSidebarOpen((value) => !value)}
            className="detail-sidebar-toggle"
            aria-label={
              sidebarOpen ? "Collapse ticket details" : "Expand ticket details"
            }
          >
            {sidebarOpen ? (
              <ChevronLeft />
            ) : (
              <ChevronDown className="-rotate-90" />
            )}
          </button>

          {sidebarOpen ? (
            <dl className="space-y-4 pr-7">
              <Meta label="Status">
                <ChoiceTag
                  label={ticket.status}
                  colors={statusColors[ticket.status]}
                />
              </Meta>

              <Meta label="Priority">
                <ChoiceTag
                  label={ticket.priority}
                  colors={priorityColors[ticket.priority]}
                />
              </Meta>

              <Meta label="Ticket Type">
                <ChoiceTag label={ticket.type} colors={typeColors[ticket.type]} />
              </Meta>

              <Meta label="Project" value={ticket.project || "Not set"} />
              <Meta label="Module" value="Managed by project" />
              <Meta label="Sub Module" value="Managed by project" />
              <Meta
                label="Priority Number"
                value={
                  priorityNumber[ticket.priority] === "—"
                    ? "Not assigned"
                    : `#${priorityNumber[ticket.priority]}`
                }
              />
              <Meta
                label="Assignee"
                value={ticket.assignee || "Not set"}
              />
              <Meta
                label="Created By"
                value={ticket.reporter || "Not set"}
              />
              <Meta label="Due Date" value={formatDate(ticket.dueDate)} />
              <Meta label="Estimated Time" value="Managed by support team" />
              <Meta label="Created Date" value={formatDate(ticket.createdAt)} />
              <Meta label="Last Updated" value={formatDate(ticket.updatedAt)} />
            </dl>
          ) : null}
        </aside>

        <main className="min-w-0 px-0 pt-7 lg:px-8 lg:pt-0">
          <section>
            <h2 className="detail-heading">{ticket.title}</h2>

            <div className="mt-7 flex items-center gap-2">
              <h3 className="detail-subheading">Description</h3>
            </div>

            <div
              className="detail-body prose-ticket mt-2 w-full text-left"
              dangerouslySetInnerHTML={{
                __html: sanitizeRichText(
                  ticket.description || "No description provided.",
                ).replace(/\n/g, "<br />"),
              }}
            />
          </section>

          <section className="mt-7">
            <h3 className="detail-subheading">Attachments</h3>

            <div className="mt-3 flex flex-wrap gap-3">
              {media
                .filter((item) => item.type !== "Links")
                .slice(0, 5)
                .map((item) => (
                  <AttachmentPreview
                    key={item.id}
                    label={item.title}
                    href={item.url}
                  />
                ))}

              {!media.some((item) => item.type !== "Links") ? (
                <span className="detail-body text-slate-400">
                  No attachments uploaded.
                </span>
              ) : null}
            </div>
          </section>

          <section className="mt-7">
            <h3 className="detail-subheading">URL Links</h3>

            <div className="detail-body mt-3 space-y-3">
              {media
                .filter((item) => item.type === "Links")
                .map((item) => (
                  <a
                    key={item.id}
                    className="block underline hover:text-sky-600"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.title}: {item.meta}
                  </a>
                ))}

              {!ticket.links.length ? (
                <span className="text-slate-400">No links added.</span>
              ) : null}
            </div>
          </section>

          <section className="mt-7">
            <h3 className="detail-subheading mb-3">Comments</h3>

            <div className="comments-panel">
              <div className="comments-tabs">
                <button
                  type="button"
                  onClick={() => setTab("chat")}
                  className={tab === "chat" ? "active" : ""}
                >
                  Chat Details
                </button>

                <button
                  type="button"
                  onClick={() => setTab("media")}
                  className={tab === "media" ? "active" : ""}
                >
                  Media
                </button>
              </div>

              {tab === "chat" ? (
                <ChatArea
                  comments={ticket.comments ?? []}
                  message={message}
                  setMessage={setMessage}
                  pendingFiles={pendingFiles}
                  onAttach={() => fileInput.current?.click()}
                  onSend={() => void sendComment()}
                  inputRef={commentInput}
                  canComment={Boolean(ticket.permissions?.canComment)}
                />
              ) : (
                <MediaArea media={media} onSeeAll={setMediaModal} />
              )}
            </div>

            <input
              ref={fileInput}
              className="hidden"
              type="file"
              multiple
              disabled={!ticket.permissions?.canUpload || busy}
              onChange={(event) => {
                void upload(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
          </section>

          <section className="mb-4 mt-8">
            <h3 className="detail-subheading">Activity History</h3>

            <ul className="activity-summary mt-3">
              {(ticket.activities ?? []).map((activity) => (
                <li key={activity.id}>
                  {activity.action} · {activity.user} ·{" "}
                  {formatDateTime(activity.createdAt)}
                </li>
              ))}

              {!ticket.activities?.length ? (
                <li>Ticket created · {formatDate(ticket.createdAt)}</li>
              ) : null}
            </ul>
          </section>
        </main>
      </div>

      {mediaModal ? (
        <MediaModal
          type={mediaModal}
          items={media.filter((item) => item.type === mediaModal)}
          onClose={() => setMediaModal(undefined)}
        />
      ) : null}

      {editOpen ? (
        <EditTicketModal
          title={title}
          description={description}
          dueDate={dueDate}
          setTitle={setTitle}
          setDescription={setDescription}
          setDueDate={setDueDate}
          busy={busy}
          onClose={() => setEditOpen(false)}
          onSave={async () => {
            const ok = await patch({
              action: "edit",
              title: title.trim(),
              description,
              dueDate,
            });

            if (ok) {
              setEditOpen(false);
            }
          }}
        />
      ) : null}

      {pendingChange ? (
        <ConfirmationModal
          message={pendingChange.message}
          onCancel={() => setPendingChange(undefined)}
          onConfirm={async () => {
            const apply = pendingChange.apply;
            setPendingChange(undefined);
            await apply();
          }}
        />
      ) : null}

      {notice ? (
        <div role="status" className="ticket-toast ticket-toast-error">
          <p className="text-sm font-medium">{notice}</p>
          <button
            type="button"
            className="ml-auto"
            onClick={() => setNotice("")}
            aria-label="Dismiss"
          >
            <X size={17} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function EditTicketModal({
  title,
  description,
  dueDate,
  setTitle,
  setDescription,
  setDueDate,
  busy,
  onClose,
  onSave,
}: {
  title: string;
  description: string;
  dueDate: string;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setDueDate: (value: string) => void;
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onClose()
      }
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-edit-ticket-title"
        className="ticket-modal !w-[620px]"
      >
        <div className="flex items-center justify-between">
          <h2
            id="client-edit-ticket-title"
            className="text-[1.65rem] font-bold text-slate-700"
          >
            Edit Ticket Details
          </h2>
          <button type="button" onClick={onClose} className="row-icon">
            <X />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-2 block font-bold text-slate-700">
              Ticket title
            </span>
            <input
              maxLength={255}
              className="field"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-2 block font-bold text-slate-700">
              Description
            </span>
            <textarea
              rows={7}
              className="field resize-y"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="mb-2 block font-bold text-slate-700">
              Due Date
            </span>
            <input
              type="date"
              className="field"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-cyan-500 px-5 py-3 text-sm font-bold text-[#0284C7] hover:bg-[#E6F8FB]"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={busy || !title.trim()}
            className="button-primary !px-6 !py-3 disabled:opacity-50"
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmationModal({
  message,
  onCancel,
  onConfirm,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div className="modal-backdrop">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="client-ticket-confirmation-title"
        className="ticket-modal !w-[390px] !p-5"
      >
        <h2
          id="client-ticket-confirmation-title"
          className="text-[1.65rem] font-bold text-slate-700"
        >
          Confirmation
        </h2>

        <p className="mt-5 text-base font-semibold text-slate-700">{message}</p>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            className="rounded-xl border border-cyan-500 px-7 py-3 text-sm font-bold text-[#0284C7] hover:bg-[#E6F8FB]"
            onClick={onCancel}
          >
            No
          </button>

          <button
            type="button"
            className="button-primary !px-7 !py-3"
            onClick={() => void onConfirm()}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}

function ChoiceTag({
  label,
  colors,
}: {
  label: string;
  colors: string;
}) {
  return (
    <span
      className={cn(
        "detail-tag ring-1 ring-inset",
        colors,
      )}
    >
      {label}
    </span>
  );
}

function Meta({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="detail-subheading">{label}</dt>
      <dd className="detail-body mt-0.5">{children ?? value}</dd>
    </div>
  );
}

function AttachmentPreview({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group block w-28 text-left"
    >
      <span className="grid h-16 place-items-center overflow-hidden rounded border border-slate-200 bg-gradient-to-br from-slate-50 to-sky-50">
        <FileImage className="text-sky-500" />
      </span>
      <span className="mt-1 block truncate text-xs text-slate-500 group-hover:text-sky-600">
        {label}
      </span>
    </a>
  );
}

function ChatArea({
  comments,
  message,
  setMessage,
  pendingFiles,
  onAttach,
  onSend,
  inputRef,
  canComment,
}: {
  comments: NonNullable<ClientPortalTicket["comments"]>;
  message: string;
  setMessage: (value: string) => void;
  pendingFiles: string[];
  onAttach: () => void;
  onSend: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  canComment: boolean;
}) {
  return (
    <div className="chat-area">
      <div className="max-h-[430px] space-y-5 overflow-y-auto p-5">
        {comments.map((comment, index) => {
          const fallback = comment.user
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || "U";

          return (
          <div
            key={comment.id}
            className={cn("flex items-start gap-3", index % 2 && "justify-end")}
          >
            <span className="mt-1 grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#0284C7]/10 text-[11px] font-semibold text-[#0284C7]">
              {comment.avatar ? (
                <img src={comment.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                fallback
              )}
            </span>
            <div
              className={cn(
                "max-w-[78%] rounded-2xl px-4 py-3",
                index % 2
                  ? "rounded-br-sm bg-[#E6F8FB]"
                  : "rounded-bl-sm bg-slate-100",
              )}
            >
              <div className="mb-1 flex items-center gap-2">
                <strong className="text-sm text-[#101828]">
                  {comment.user}
                </strong>
                <time className="text-[11px] text-slate-400">
                  {formatDateTime(comment.createdAt)}
                </time>
              </div>
              <p className="detail-body !text-sm">{comment.content}</p>
              {comment.attachments?.map((file) => (
                <span
                  key={file}
                  className="mt-2 flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 text-xs text-sky-700"
                >
                  <Paperclip size={14} />
                  {file}
                </span>
              ))}
            </div>
          </div>
          );
        })}

        {!comments.length ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No comments yet.
          </p>
        ) : null}
      </div>

      {canComment ? (
        <div className="border-t border-slate-200 p-3">
          {pendingFiles.length ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {pendingFiles.map((file) => (
                <span
                  key={file}
                  className="rounded bg-sky-50 px-2 py-1 text-xs text-sky-700"
                >
                  {file}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={onAttach}
              className="row-icon"
              aria-label="Attach files"
            >
              <Paperclip />
            </button>

            <textarea
              ref={inputRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={2}
              className="field resize-none"
              placeholder="Write a comment..."
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSend();
                }
              }}
            />

            <button
              type="button"
              onClick={onSend}
              disabled={!message.trim()}
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#0284C7] text-white hover:bg-[#0369a1] disabled:opacity-50"
              aria-label="Send comment"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MediaArea({
  media,
  onSeeAll,
}: {
  media: MediaItem[];
  onSeeAll: (type: MediaType) => void;
}) {
  return (
    <div className="space-y-5 p-4">
      {(["Photos and videos", "Documents", "Links"] as MediaType[]).map(
        (type) => (
          <MediaSection
            key={type}
            title={type}
            onSeeAll={() => onSeeAll(type)}
          >
            {type === "Photos and videos" ? (
              <div className="flex gap-2 overflow-hidden">
                {media
                  .filter((item) => item.type === type)
                  .slice(0, 5)
                  .map((item) => (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      title={item.title}
                      key={item.id}
                      className="grid size-20 shrink-0 place-items-center rounded border border-slate-200 bg-gradient-to-br from-sky-50 to-slate-100 hover:border-sky-300"
                    >
                      <FileImage className="text-sky-500" />
                    </a>
                  ))}
              </div>
            ) : (
              media
                .filter((item) => item.type === type)
                .slice(0, 2)
                .map((item) => <MediaRow key={item.id} item={item} />)
            )}
          </MediaSection>
        ),
      )}
    </div>
  );
}

function MediaSection({
  title,
  children,
  onSeeAll,
}: {
  title: string;
  children: React.ReactNode;
  onSeeAll: () => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">{title}</h4>
        <button
          type="button"
          onClick={onSeeAll}
          className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-500"
        >
          See All
          <ArrowRight size={16} />
        </button>
      </div>
      {children}
    </section>
  );
}

function MediaRow({
  item,
  showDate = false,
}: {
  item: MediaItem;
  showDate?: boolean;
}) {
  const icon =
    item.type === "Links" ? (
      <Link2 className="text-slate-400" />
    ) : item.title.toLowerCase().endsWith(".pdf") ? (
      <FileText className="text-red-500" />
    ) : (
      <File className="text-blue-600" />
    );

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-sky-300 hover:bg-sky-50 last:mb-0"
    >
      <span className="grid size-9 place-items-center">{icon}</span>

      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm font-medium text-slate-700">
          {item.title}
        </strong>
        <small className="block truncate text-slate-500">
          {item.meta}
          {showDate ? ` · ${item.date}` : ""}
        </small>
      </span>

      <ExternalLink size={16} className="text-slate-400" />
    </a>
  );
}

function MediaModal({
  type,
  items,
  onClose,
}: {
  type: MediaType;
  items: MediaItem[];
  onClose: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onClose()
      }
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-media-modal-title"
        className="ticket-modal !max-h-[85vh] !w-[680px] overflow-y-auto"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white pb-4">
          <div>
            <h2 id="client-media-modal-title" className="detail-heading">
              All {type}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {items.length} item{items.length === 1 ? "" : "s"}, including
              upload dates
            </p>
          </div>

          <button type="button" onClick={onClose} className="row-icon">
            <X />
          </button>
        </div>

        {items.length ? (
          <div
            className={
              type === "Photos and videos"
                ? "grid gap-3 sm:grid-cols-2"
                : "space-y-2"
            }
          >
            {items.map((item) =>
              type === "Photos and videos" ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  key={item.id}
                  className="group rounded-xl border border-slate-200 p-3 hover:border-sky-300 hover:bg-sky-50"
                >
                  <div className="grid h-32 place-items-center rounded-lg bg-gradient-to-br from-sky-50 to-slate-100">
                    <FileImage className="text-sky-500" />
                  </div>
                  <span className="mt-2 flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <strong className="block truncate text-sm font-medium text-slate-700">
                        {item.title}
                      </strong>
                      <time className="text-xs text-slate-500">{item.date}</time>
                    </span>
                    <ExternalLink
                      size={16}
                      className="shrink-0 text-slate-400"
                    />
                  </span>
                </a>
              ) : (
                <MediaRow key={item.id} item={item} showDate />
              ),
            )}
          </div>
        ) : (
          <p className="py-10 text-center text-slate-500">
            No media in this category.
          </p>
        )}
      </div>
    </div>
  );
}
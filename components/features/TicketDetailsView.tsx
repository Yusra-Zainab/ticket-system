"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  FileImage,
  FileText,
  Link2,
  Paperclip,
  Plus,
  Send,
  X,
} from "lucide-react";

import StatusBadge from "@/components/ui/StatusBadge";
import {
  ticketPriorityDescriptions,
  ticketStatusDescriptions,
} from "@/lib/statusOptions";
import { cn, formatDate, sanitizeRichText } from "@/lib/utils";
import type { Status, Ticket, TicketAttachment } from "@/types";

type DetailTab = "chat" | "media";
export type TicketDetailsPortal = "admin" | "client" | "resource";
export type UserRole = "Admin" | "Project Manager" | "Developer" | "Client";
export type TicketDetailAction =
  | "Change Status"
  | "Assign Resource"
  | "Change Priority"
  | "Upload File"
  | "Add Comment"
  | "Mark Resolved"
  | "Edit Ticket Details";

type Comment = {
  id: string;
  userId: string;
  user: string;
  time: string;
  text: string;
  avatar?: string | null;
  attachments?: string[];
};

type MediaType = "Photos and videos" | "Documents" | "Links";
type MediaItem = {
  id: string;
  type: MediaType;
  title: string;
  meta: string;
  date: string;
  url: string;
};
type Priority = (typeof priorities)[number];
type PendingChange = { message: string; apply: () => void | Promise<void> };

const roleActions: Record<UserRole, TicketDetailAction[]> = {
  Admin: [
    "Change Status",
    "Assign Resource",
    "Change Priority",
    "Upload File",
    "Add Comment",
    "Mark Resolved",
  ],
  "Project Manager": [
    "Change Status",
    "Assign Resource",
    "Change Priority",
    "Upload File",
    "Add Comment",
  ],
  Developer: ["Change Status", "Upload File", "Add Comment", "Mark Resolved"],
  Client: ["Upload File", "Add Comment"],
};

const statuses: Status[] = [
  "Open",
  "In Progress",
  "Blocked",
  "Ready for Review",
  "Closed",
];

const priorities = ["Critical", "High", "Medium", "Low"] as const;
const priorityNumber = { Critical: 1, High: 2, Medium: 3, Low: 4 } as const;

const statusColors: Partial<Record<Status, string>> = {
  Open: "bg-blue-50 text-blue-700 ring-blue-600/20",
  "In Progress": "bg-teal-50 text-teal-700 ring-teal-600/20",
  Blocked: "bg-orange-50 text-orange-700 ring-orange-600/20",
  "Ready for Review": "bg-violet-50 text-violet-700 ring-violet-600/20",
  Closed: "bg-gray-700 text-white ring-gray-800",
};

const priorityColors: Record<Priority, string> = {
  Critical: "bg-red-600 text-white ring-red-700",
  High: "bg-orange-600 text-white ring-orange-700",
  Medium: "bg-yellow-600 text-white ring-yellow-700",
  Low: "bg-green-600 text-white ring-green-700",
};

const ticketTypeColors: Record<string, string> = {
  Bug: "bg-red-50 text-red-700 ring-red-200",
  Feedback: "bg-orange-50 text-orange-700 ring-orange-200",
  "Technical Issue": "bg-amber-50 text-amber-700 ring-amber-200",
  "New Feature": "bg-violet-50 text-violet-700 ring-violet-200",
  Task: "bg-blue-50 text-blue-700 ring-blue-200",
  "Support Request": "bg-teal-50 text-teal-700 ring-teal-200",
  "UI/UX Issue": "bg-pink-50 text-pink-700 ring-pink-200",
  "Content Update": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Testing / QA": "bg-cyan-50 text-cyan-700 ring-cyan-200",
  Maintenance: "bg-slate-50 text-slate-700 ring-slate-200",
  "Urgent Fix": "bg-red-50 text-red-700 ring-red-200",
  "System Down": "bg-indigo-50 text-indigo-700 ring-indigo-200",
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeStatus(value: unknown): Status {
  const status = asString(value).trim();
  switch (status) {
    case "Active":
      return "In Progress";
    case "QA":
    case "Validation":
      return "Ready for Review";
    case "Resolved":
    case "Cancelled":
      return "Closed";
    case "Awaiting":
      return "Open";
    case "Critical":
      return "Open";
    default:
      return (status || "Open") as Status;
  }
}

function resourceStatus(value: Status) {
  switch (value) {
    case "In Progress":
      return "Active";
    case "Blocked":
      return "Blocked";
    case "Ready for Review":
      return "QA";
    case "Closed":
      return "Validation";
    default:
      return "Awaiting";
  }
}

function buildTicketMedia(ticket: Ticket): MediaItem[] {
  const data = asRecord(ticket.formData);
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
  const urls = asStringArray(data.urls).length
    ? asStringArray(data.urls)
    : asStringArray(data.links);

  return [
    ...attachments.map((attachment) => ({
      id: attachment.id,
      type:
        attachment.mimeType?.startsWith("image/") ||
        attachment.mimeType?.startsWith("video/")
          ? ("Photos and videos" as MediaType)
          : ("Documents" as MediaType),
      title: attachment.name,
      meta: `${Math.max(1, Math.round(Number(attachment.size || 0) / 1024))} KB`,
      date: formatDate(attachment.uploadedAt || ticket.created),
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
}

function readTicketActivities(ticket: Ticket) {
  const data = asRecord(ticket.formData);
  const activity = Array.isArray(data.activity)
    ? data.activity.filter((item): item is string => typeof item === "string")
    : [];

  if (activity.length) return activity;

  const portalActivity = Array.isArray(data.activities) ? data.activities : [];
  const mapped = portalActivity
    .map((item) => {
      const row = asRecord(item);
      const action = asString(row.action);
      const user = asString(row.user);
      const status = asString(row.status);
      return [action, user, status].filter(Boolean).join(" · ");
    })
    .filter(Boolean);

  return mapped.length ? mapped : [`Ticket loaded from database: ${ticket.id}`];
}

function readTicketComments(ticket: Ticket): Comment[] {
  const data = asRecord(ticket.formData);
  const stored = Array.isArray(data.comments) ? data.comments : [];

  return stored.flatMap((item, index): Comment[] => {
    const row = asRecord(item);
    const user = asString(row.user || row.name);
    const text = asString(row.text || row.content);
    if (!user || !text) return [];

    const rawTime = asString(row.time || row.createdAt);
    const time = rawTime && rawTime !== "Just now" ? formatDateTime(rawTime) : rawTime || "";

    return [
      {
        id: String(row.id ?? `comment-${index}`),
        userId: String(row.userId ?? ""),
        user,
        time,
        text,
        avatar: typeof row.avatar === "string" ? row.avatar : null,
        attachments: asStringArray(row.attachments),
      },
    ];
  });
}

function formatDateTime(value: string) {
  if (!value) return "";
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

function endpoints(portal: TicketDetailsPortal, ticketId: string) {
  const id = encodeURIComponent(ticketId);
  if (portal === "client") {
    return {
      update: `/api/client-portal/tickets/${id}`,
      upload: `/api/client-portal/tickets/${id}/attachments`,
      create: "/client-portal/tickets/new",
    };
  }
  if (portal === "resource") {
    return {
      update: `/api/tickets/${id}`,
      upload: `/api/tickets/${id}/attachments`,
      create: "/resource-portal/tickets/new",
    };
  }
  return {
    update: `/api/tickets/${id}`,
    upload: `/api/tickets/${id}/attachments`,
    create: "/tickets/new",
  };
}

export default function TicketDetailsView({
  ticket,
  portal = "admin",
  currentRole = "Admin",
  currentUserId = "",
  currentUserName = "",
  resourceOptions = [],
  allowedActions,
}: {
  ticket: Ticket;
  portal?: TicketDetailsPortal;
  currentRole?: UserRole;
  currentUserId?: string;
  currentUserName?: string;
  resourceOptions?: string[];
  allowedActions?: TicketDetailAction[];
}) {
  const data = asRecord(ticket.formData);
  const api = endpoints(portal, ticket.id);

  const persistedTitle = asString(data.title, ticket.title);
  const persistedDescription = asString(data.description, ticket.description);
  const persistedStatus = normalizeStatus(ticket.status);
  const persistedPriority: Priority =
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
  const [activeAction, setActiveAction] = useState<TicketDetailAction>();
  const [title, setTitle] = useState(persistedTitle);
  const [titleDraft, setTitleDraft] = useState(persistedTitle);
  const [description, setDescription] = useState(persistedDescription);
  const [descriptionDraft, setDescriptionDraft] = useState(persistedDescription);
  const [status, setStatus] = useState<Status>(persistedStatus);
  const [priority, setPriority] = useState<Priority>(persistedPriority);
  const [assignee, setAssignee] = useState(persistedAssignee);
  const [comments, setComments] = useState<Comment[]>(() => readTicketComments(ticket));
  const [message, setMessage] = useState("");
  const [pendingFiles, setPendingFiles] = useState<string[]>([]);
  const [media, setMedia] = useState<MediaItem[]>(() => buildTicketMedia(ticket));
  const [mediaModal, setMediaModal] = useState<MediaType>();
  const [pendingChange, setPendingChange] = useState<PendingChange>();
  const [notice, setNotice] = useState("");
  const [activities, setActivities] = useState<string[]>(() => readTicketActivities(ticket));
  const [busy, setBusy] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const commentInput = useRef<HTMLTextAreaElement>(null);
  const commentsSection = useRef<HTMLElement>(null);

  const actions = allowedActions ?? roleActions[currentRole];
  const visibleActions = actions.slice(0, 6);
  const overflowActions = useMemo(() => actions.slice(6), [actions]);
  const availableResources = resourceOptions.length
    ? resourceOptions
    : persistedAssignee
      ? [persistedAssignee]
      : [];

  function log(text: string) {
    setActivities((items) => [text, ...items].slice(0, 50));
  }

  async function requestJson(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      [key: string]: unknown;
    };
    if (!response.ok) throw new Error(body.error || "Unable to update ticket.");
    return body;
  }

  async function patchTicket(payload: Record<string, unknown>) {
    if (portal === "resource") {
      if (typeof payload.status === "string") {
        return requestJson(api.update, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "status",
            status: resourceStatus(normalizeStatus(payload.status)),
          }),
        });
      }

      if (payload.title !== undefined || payload.description !== undefined) {
        return requestJson(api.update, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "edit",
            title: asString(payload.title, title),
            description: asString(payload.description, description),
            dueDate: persistedDueDate,
          }),
        });
      }

      throw new Error("This action is not available in the resource portal.");
    }

    if (portal === "client") {
      throw new Error("This action is not available in the client portal.");
    }

    return requestJson(api.update, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  function openChatAndFocus() {
    setTab("chat");
    setMoreOpen(false);
    setActiveAction(undefined);
    window.requestAnimationFrame(() => {
      commentsSection.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.requestAnimationFrame(() => commentInput.current?.focus());
    });
  }

  function selectAction(action: TicketDetailAction) {
    setMoreOpen(false);

    if (action === "Add Comment") {
      openChatAndFocus();
      return;
    }

    if (action === "Upload File") {
      fileInput.current?.click();
      return;
    }

    setActiveAction(action);
  }

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    try {
      setBusy(true);
      setNotice("");
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file, file.name));
      const body = await requestJson(api.upload, { method: "POST", body: formData });
      const uploaded = Array.isArray(body.attachments)
        ? body.attachments.filter(
            (item): item is TicketAttachment =>
              Boolean(item && typeof item === "object" && "name" in item && "url" in item),
          )
        : [];

      setPendingFiles((items) => [...items, ...uploaded.map((item) => item.name)]);
      setMedia((items) => [
        ...uploaded.map((attachment) => ({
          id: String(attachment.id),
          type:
            attachment.mimeType?.startsWith("image/") ||
            attachment.mimeType?.startsWith("video/")
              ? ("Photos and videos" as const)
              : ("Documents" as const),
          title: attachment.name,
          meta: `${Math.max(1, Math.round(Number(attachment.size || 0) / 1024))} KB`,
          date: formatDate(attachment.uploadedAt || new Date().toISOString()),
          url: attachment.url,
        })),
        ...items,
      ]);
      log(uploaded.length === 1 ? `File uploaded: ${uploaded[0].name}` : `${uploaded.length} files uploaded`);
      setTab("media");
      setActiveAction(undefined);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to upload files.");
    } finally {
      setBusy(false);
    }
  }

  async function addComment() {
    if ((!message.trim() && !pendingFiles.length) || busy) return;

    try {
      setBusy(true);
      setNotice("");
      const body = await requestJson(
        `/api/ticket-comments/${portal}/${encodeURIComponent(ticket.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: message.trim() || "Shared attachments",
            attachments: pendingFiles,
          }),
        },
      );

      const row = asRecord(body.comment);
      const nextComment: Comment = {
        id: String(row.id ?? Date.now()),
        userId: String(row.userId ?? currentUserId),
        user: asString(row.user, currentUserName || "User"),
        time: formatDateTime(asString(row.createdAt)) || "Just now",
        text: asString(row.text || row.content, message.trim() || "Shared attachments"),
        avatar: typeof row.avatar === "string" ? row.avatar : null,
        attachments: asStringArray(row.attachments),
      };

      setComments((items) => [...items, nextComment].slice(-100));
      setMessage("");
      setPendingFiles([]);
      setTab("chat");
      setActiveAction(undefined);
      log(`Comment added by ${nextComment.user}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to add comment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ticket-detail-page">
      <header className="sticky top-0 z-30 -mx-2 flex flex-col gap-5 border-b border-slate-100 bg-white/95 px-2 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <h1 className="detail-page-title">Ticket Details</h1>
        <Link href={api.create} className="button-primary">
          <Plus size={18} />
          Create a New Ticket
        </Link>
      </header>

      <div className="mt-8 flex justify-end">
        <div className="detail-action-row">
          {visibleActions.map((action, index) => (
            <button
              type="button"
              key={action}
              disabled={busy}
              onClick={() => selectAction(action)}
              className={cn("detail-action-button", index > 2 && "hidden lg:inline-flex")}
            >
              {action}
            </button>
          ))}

          {(visibleActions.length > 3 || overflowActions.length > 0) && (
            <div className="relative">
              <button
                type="button"
                disabled={busy}
                onClick={() => setMoreOpen((value) => !value)}
                className="detail-action-button"
                aria-expanded={moreOpen}
              >
                More
                <ChevronDown size={16} />
              </button>
              {moreOpen && (
                <div className="detail-more-menu">
                  {[...visibleActions.slice(3), ...overflowActions].map((action) => (
                    <button type="button" key={action} onClick={() => selectAction(action)}>
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
            aria-label={sidebarOpen ? "Collapse ticket details" : "Expand ticket details"}
          >
            {sidebarOpen ? <ChevronLeft /> : <ChevronDown className="-rotate-90" />}
          </button>

          {sidebarOpen && (
            <dl className="space-y-4 pr-7">
              <Meta label="Status">
                <StatusBadge status={status} />
              </Meta>
              <Meta label="Priority">
                <ChoiceTag label={priority} colors={priorityColors[priority]} />
              </Meta>
              <Meta label="Ticket Type">
                <ChoiceTag
                  label={persistedType}
                  colors={ticketTypeColors[persistedType] ?? "bg-slate-50 text-slate-700 ring-slate-200"}
                />
              </Meta>
              <Meta label="Project" value={persistedProject || "Not set"} />
              <Meta label="Module" value={persistedModule || "Not set"} />
              <Meta label="Sub Module" value={persistedSubModule || "Not set"} />
              <Meta label="Priority Number" value={`#${priorityNumber[priority]}`} />
              <Meta label="Assignee" value={assignee ? `${assignee} — Developer` : "Not set"} />
              <Meta label="Created By" value={persistedCreatedBy || "Not set"} />
              <Meta label="Due Date" value={formatDate(persistedDueDate)} />
              <Meta label="Estimated Time" value={persistedEstimatedTime || "Not set"} />
              <Meta label="Created Date" value={formatDate(ticket.created)} />
              <Meta label="Ticket ID" value={ticket.id} />
            </dl>
          )}
        </aside>

        <main className="min-w-0 px-8 pb-20 pt-1 lg:pl-8">
          <section>
            <h2 className="detail-page-title !text-[24px] !leading-8">{title}</h2>
            <div
              className="prose-ticket detail-body mt-4"
              dangerouslySetInnerHTML={{
                __html: sanitizeRichText(description || "No description has been added."),
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
                  <AttachmentPreview key={item.id} label={item.title} href={item.url} />
                ))}
              {!media.some((item) => item.type !== "Links") && (
                <span className="detail-body">No attachments uploaded.</span>
              )}
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
                    {item.title}
                  </a>
                ))}
              {!media.some((item) => item.type === "Links") && <span>No links added.</span>}
            </div>
          </section>

          <section ref={commentsSection} id="ticket-chat" className="mt-7 scroll-mt-24">
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
                  comments={comments}
                  message={message}
                  setMessage={setMessage}
                  pendingFiles={pendingFiles}
                  onAttach={() => fileInput.current?.click()}
                  onSend={() => void addComment()}
                  inputRef={commentInput}
                  currentUserId={currentUserId}
                  currentUserName={currentUserName}
                  busy={busy}
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
              onChange={(event) => {
                void handleFiles(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
          </section>

          <section className="mb-4 mt-8">
            <h3 className="detail-subheading">Activity History</h3>
            <ul className="activity-summary mt-3">
              {activities.map((activity, index) => (
                <li key={`${activity}-${index}`}>{activity}</li>
              ))}
            </ul>
          </section>
        </main>
      </div>

      {mediaModal && (
        <MediaModal
          type={mediaModal}
          items={media.filter((item) => item.type === mediaModal)}
          onClose={() => setMediaModal(undefined)}
        />
      )}

      {activeAction && (
        <ActionModal
          action={activeAction}
          status={status}
          priority={priority}
          assignee={assignee}
          resources={availableResources}
          titleDraft={titleDraft}
          descriptionDraft={descriptionDraft}
          setTitleDraft={setTitleDraft}
          setDescriptionDraft={setDescriptionDraft}
          onClose={() => setActiveAction(undefined)}
          requestChange={(change) => {
            setActiveAction(undefined);
            setPendingChange(change);
          }}
          applyStatus={async (value) => {
            await patchTicket({ status: value });
            setStatus(value);
            log(`Status changed to ${value}`);
          }}
          applyPriority={async (value) => {
            await patchTicket({
              priorityType: value,
              priorityNumber: priorityNumber[value],
            });
            setPriority(value);
            log(`Priority changed to ${value}`);
          }}
          applyAssignee={async (value) => {
            await patchTicket({ assignedTo: value });
            setAssignee(value);
            log(`Ticket assigned to ${value}`);
          }}
          applyDetails={async () => {
            const nextTitle = titleDraft.trim() || title;
            const nextDescription = descriptionDraft.trim() || description;
            await patchTicket({ title: nextTitle, description: nextDescription });
            setTitle(nextTitle);
            setDescription(nextDescription);
            log("Ticket details updated");
          }}
        />
      )}

      {pendingChange && (
        <ConfirmationModal
          message={pendingChange.message}
          onCancel={() => setPendingChange(undefined)}
          onConfirm={async () => {
            try {
              setBusy(true);
              await pendingChange.apply();
              setPendingChange(undefined);
            } catch (error) {
              setNotice(error instanceof Error ? error.message : "Unable to update ticket.");
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {notice && (
        <div role="status" className="ticket-toast ticket-toast-error">
          <p className="text-sm font-medium">{notice}</p>
          <button type="button" className="ml-auto" onClick={() => setNotice("")} aria-label="Dismiss">
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

function ChoiceTag({ label, colors }: { label: string; colors: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-24 justify-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
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

function AttachmentPreview({ label, href }: { label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="group block w-28 text-left">
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
  currentUserId,
  currentUserName,
  busy,
}: {
  comments: Comment[];
  message: string;
  setMessage: (value: string) => void;
  pendingFiles: string[];
  onAttach: () => void;
  onSend: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  currentUserId: string;
  currentUserName: string;
  busy: boolean;
}) {
  function isMine(comment: Comment) {
    if (comment.userId && currentUserId) {
      return String(comment.userId) === String(currentUserId);
    }
    return Boolean(
      currentUserName &&
        comment.user.trim().toLowerCase() === currentUserName.trim().toLowerCase(),
    );
  }

  return (
    <div className="chat-area">
      <div className="max-h-[430px] space-y-5 overflow-y-auto p-5">
        {comments.map((comment) => {
          const mine = isMine(comment);
          return (
            <div key={comment.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-4 py-3",
                  mine ? "rounded-br-sm bg-[#E6F8FB]" : "rounded-bl-sm bg-slate-100",
                )}
              >
                <div className="mb-1 flex items-center gap-2">
                  <strong className="text-sm text-[#101828]">{comment.user}</strong>
                  <time className="text-[11px] text-slate-400">{comment.time}</time>
                </div>
                <p className="detail-body !text-sm whitespace-pre-wrap">{comment.text}</p>
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

        {!comments.length && (
          <p className="py-8 text-center text-sm text-slate-400">No comments yet.</p>
        )}
      </div>

      <div className="border-t border-slate-200 p-3">
        {!!pendingFiles.length && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingFiles.map((file) => (
              <span key={file} className="rounded bg-sky-50 px-2 py-1 text-xs text-sky-700">
                {file}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <button type="button" onClick={onAttach} disabled={busy} className="row-icon" aria-label="Attach files">
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
            disabled={busy || (!message.trim() && !pendingFiles.length)}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#0284C7] text-white hover:bg-[#0369a1] disabled:opacity-50"
            aria-label="Send comment"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
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
  const groups: MediaType[] = ["Photos and videos", "Documents", "Links"];
  return (
    <div className="space-y-6 p-5">
      {groups.map((type) => {
        const items = media.filter((item) => item.type === type);
        return (
          <section key={type}>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="detail-subheading">{type}</h4>
              {!!items.length && (
                <button
                  type="button"
                  onClick={() => onSeeAll(type)}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#0284C7]"
                >
                  See All <ArrowRight size={16} />
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.slice(0, 3).map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
              {!items.length && <p className="detail-body text-sm">No {type.toLowerCase()}.</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MediaCard({ item }: { item: MediaItem }) {
  const Icon = item.type === "Links" ? Link2 : item.type === "Documents" ? FileText : FileImage;
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-sky-300"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600">
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-sm text-slate-700">{item.title}</strong>
        <small className="block truncate text-xs text-slate-400">{item.meta}</small>
      </span>
      <ExternalLink size={15} className="shrink-0 text-slate-400" />
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
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className="ticket-modal !w-[760px]">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">{type}</h2>
          <button type="button" onClick={onClose} className="row-icon" aria-label="Close">
            <X />
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
          {!items.length && <p className="text-sm text-slate-500">No items.</p>}
        </div>
      </div>
    </div>
  );
}

function ActionModal({
  action,
  status,
  priority,
  assignee,
  resources,
  titleDraft,
  descriptionDraft,
  setTitleDraft,
  setDescriptionDraft,
  onClose,
  requestChange,
  applyStatus,
  applyPriority,
  applyAssignee,
  applyDetails,
}: {
  action: TicketDetailAction;
  status: Status;
  priority: Priority;
  assignee: string;
  resources: string[];
  titleDraft: string;
  descriptionDraft: string;
  setTitleDraft: (value: string) => void;
  setDescriptionDraft: (value: string) => void;
  onClose: () => void;
  requestChange: (change: PendingChange) => void;
  applyStatus: (value: Status) => Promise<void>;
  applyPriority: (value: Priority) => Promise<void>;
  applyAssignee: (value: string) => Promise<void>;
  applyDetails: () => Promise<void>;
}) {
  const [statusDraft, setStatusDraft] = useState(status);
  const [priorityDraft, setPriorityDraft] = useState(priority);
  const [assigneeDraft, setAssigneeDraft] = useState(assignee);

  const confirm = (message: string, apply: () => void | Promise<void>) =>
    requestChange({ message, apply });

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className="ticket-modal">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{action}</h2>
          <button type="button" onClick={onClose} className="row-icon" aria-label="Close">
            <X />
          </button>
        </div>

        {action === "Change Status" && (
          <div className="mt-5 space-y-3">
            {statuses.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setStatusDraft(item)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border p-3",
                  item === statusDraft ? "border-sky-400 bg-sky-50" : "border-slate-200",
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <ChoiceTag label={item} colors={statusColors[item] ?? "bg-slate-50 text-slate-700 ring-slate-200"} />
                  <span className="truncate text-sm font-medium text-slate-600">
                    {ticketStatusDescriptions[item as keyof typeof ticketStatusDescriptions] ?? "Update the current ticket status"}
                  </span>
                </span>
              </button>
            ))}
            <ModalActions
              onClose={onClose}
              onSave={() => confirm(`Change ticket status to ${statusDraft}?`, () => applyStatus(statusDraft))}
            />
          </div>
        )}

        {action === "Change Priority" && (
          <div className="mt-5 space-y-3">
            {priorities.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setPriorityDraft(item)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border p-3",
                  item === priorityDraft ? "border-sky-400 bg-sky-50" : "border-slate-200",
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <ChoiceTag label={item} colors={priorityColors[item]} />
                  <span className="truncate text-sm font-medium text-slate-600">
                    {ticketPriorityDescriptions[item]}
                  </span>
                </span>
              </button>
            ))}
            <ModalActions
              onClose={onClose}
              onSave={() => confirm(`Change ticket priority to ${priorityDraft}?`, () => applyPriority(priorityDraft))}
            />
          </div>
        )}

        {action === "Assign Resource" && (
          <div className="mt-5">
            <select className="field" value={assigneeDraft} onChange={(event) => setAssigneeDraft(event.target.value)}>
              <option value="">Select resource</option>
              {resources.map((resource) => (
                <option key={resource} value={resource}>
                  {resource}
                </option>
              ))}
            </select>
            <ModalActions
              onClose={onClose}
              onSave={() => confirm(`Assign this ticket to ${assigneeDraft || "the selected resource"}?`, () => applyAssignee(assigneeDraft))}
            />
          </div>
        )}

        {action === "Mark Resolved" && (
          <div className="mt-5">
            <p className="text-sm text-slate-600">Mark this ticket as closed?</p>
            <ModalActions
              onClose={onClose}
              onSave={() => confirm("Mark this ticket as resolved?", () => applyStatus("Closed"))}
            />
          </div>
        )}

        {action === "Edit Ticket Details" && (
          <div className="mt-5 space-y-4">
            <label>
              <span className="label">Title</span>
              <input className="field" value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} />
            </label>
            <label>
              <span className="label">Description</span>
              <textarea
                className="field resize-y"
                rows={7}
                value={descriptionDraft}
                onChange={(event) => setDescriptionDraft(event.target.value)}
              />
            </label>
            <ModalActions
              onClose={onClose}
              onSave={() => confirm("Save these ticket detail changes?", applyDetails)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ModalActions({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  return (
    <div className="mt-5 flex justify-end gap-3">
      <button type="button" onClick={onClose} className="button-secondary">
        Cancel
      </button>
      <button type="button" onClick={onSave} className="button-primary">
        Save
      </button>
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
      <div role="alertdialog" aria-modal="true" className="ticket-modal !w-[420px]">
        <h2 className="text-lg font-semibold text-slate-900">Confirmation</h2>
        <p className="mt-3 text-sm text-slate-600">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="button-secondary">
            Cancel
          </button>
          <button type="button" onClick={() => void onConfirm()} className="button-primary">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
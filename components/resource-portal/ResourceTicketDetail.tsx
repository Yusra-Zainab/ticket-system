"use client";

import Link from "next/link";
import {
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
  UserCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import type {
  ResourcePortalTicket,
  ResourceTicketStatus,
} from "@/types/resourcePortal";

const resourceStatuses: Array<{
  value: ResourceTicketStatus;
  label: string;
}> = [
  { value: "Active", label: "In Progress" },
  { value: "Blocked", label: "Blocked" },
  { value: "Awaiting", label: "Awaiting" },
  { value: "QA", label: "In Review" },
  { value: "Validation", label: "Validation" },
];

type DetailTab = "chat" | "media";
type Action =
  | "Change Status"
  | "Assign to Me"
  | "Upload File"
  | "Add Comment"
  | "Edit Ticket Details";
type Modal = "status" | "edit" | null;

function formatDate(value: string) {
  if (!value) return "—";
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

function statusSlug(value: string) {
  return value.toLowerCase().replaceAll(" ", "-");
}

function prioritySlug(value: string) {
  return value.toLowerCase().replaceAll(" ", "-");
}

function typeSlug(value: string) {
  return value.toLowerCase().replaceAll("/", "-").replaceAll(" ", "-");
}

export default function ResourceTicketDetail({
  ticket,
}: {
  ticket: ResourcePortalTicket;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const commentInput = useRef<HTMLTextAreaElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<DetailTab>("media");
  const [moreOpen, setMoreOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(null);
  const [comment, setComment] = useState("");
  const [link, setLink] = useState("");
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [dueDate, setDueDate] = useState(ticket.dueDate || "");
  const [statusDraft, setStatusDraft] = useState<ResourceTicketStatus>(ticket.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const statusLabel =
    resourceStatuses.find((item) => item.value === ticket.status)?.label ??
    ticket.status;

  const images = useMemo(
    () =>
      ticket.attachments.filter(
        (file) =>
          file.mimeType.startsWith("image/") || file.mimeType.startsWith("video/"),
      ),
    [ticket.attachments],
  );

  const documents = useMemo(
    () =>
      ticket.attachments.filter(
        (file) =>
          !file.mimeType.startsWith("image/") &&
          !file.mimeType.startsWith("video/"),
      ),
    [ticket.attachments],
  );

  const actions = useMemo<Action[]>(() => {
    const items: Action[] = [];
    if (ticket.permissions?.canChangeStatus) items.push("Change Status");
    if (ticket.permissions?.canSelfAssign) items.push("Assign to Me");
    if (ticket.permissions?.canUpload) items.push("Upload File");
    if (ticket.permissions?.canComment) items.push("Add Comment");
    if (ticket.permissions?.canEditDetails) items.push("Edit Ticket Details");
    return items;
  }, [ticket.permissions]);

  const visibleActions = actions.slice(0, 3);
  const overflowActions = actions.slice(3);

  async function patch(body: Record<string, unknown>) {
    try {
      setBusy(true);
      setError("");

      const response = await fetch(
        `/api/resource-portal/tickets/${encodeURIComponent(ticket.id)}`,
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
      setError(
        reason instanceof Error ? reason.message : "Unable to update ticket.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function upload(files: FileList | File[] | null) {
    const incoming = Array.isArray(files) ? files : Array.from(files || []);
    if (!incoming.length) return;

    try {
      setBusy(true);
      setError("");

      const data = new FormData();
      incoming.forEach((file) => data.append("files", file));

      const response = await fetch(
        `/api/resource-portal/tickets/${encodeURIComponent(ticket.id)}/attachments`,
        { method: "POST", body: data },
      );

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Unable to upload files.");
      }

      setTab("media");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to upload files.",
      );
    } finally {
      setBusy(false);
    }
  }

  function selectAction(action: Action) {
    setMoreOpen(false);

    if (action === "Change Status") {
      setStatusDraft(ticket.status);
      setModal("status");
      return;
    }

    if (action === "Assign to Me") {
      void patch({ action: "selfAssign" });
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

    if (action === "Edit Ticket Details") {
      setTitle(ticket.title);
      setDescription(ticket.description);
      setDueDate(ticket.dueDate || "");
      setModal("edit");
    }
  }

  return (
    <>
      <div className="resource-admin-ticket-detail-page">
        <header className="resource-admin-ticket-detail-header">
          <h1>Ticket Details</h1>
          <Link
            href="/resource-portal/tickets/new"
            className="resource-admin-ticket-detail-primary-button"
          >
            <Plus size={18} />
            Create a New Ticket
          </Link>
        </header>

        {error ? (
          <div className="resource-admin-ticket-detail-error">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error">
              <X size={17} />
            </button>
          </div>
        ) : null}

        {actions.length ? (
          <div className="resource-admin-ticket-detail-actions-wrap">
            <div className="resource-admin-ticket-detail-action-row">
              {visibleActions.map((action) => (
                <button
                  type="button"
                  key={action}
                  disabled={busy}
                  onClick={() => selectAction(action)}
                  className="resource-admin-ticket-detail-action-button"
                >
                  {action === "Assign to Me" ? <UserCheck size={16} /> : null}
                  {action}
                </button>
              ))}

              {overflowActions.length ? (
                <div className="resource-admin-ticket-detail-more-wrap">
                  <button
                    type="button"
                    className="resource-admin-ticket-detail-action-button"
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen((value) => !value)}
                  >
                    More
                    <ChevronDown size={16} />
                  </button>

                  {moreOpen ? (
                    <div className="resource-admin-ticket-detail-more-menu">
                      {overflowActions.map((action) => (
                        <button
                          type="button"
                          key={action}
                          onClick={() => selectAction(action)}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          className={
            sidebarOpen
              ? "resource-admin-ticket-detail-layout sidebar-open"
              : "resource-admin-ticket-detail-layout sidebar-closed"
          }
        >
          <aside className="resource-admin-ticket-detail-sidebar">
            <button
              type="button"
              className="resource-admin-ticket-detail-sidebar-toggle"
              onClick={() => setSidebarOpen((value) => !value)}
              aria-label={
                sidebarOpen ? "Collapse ticket details" : "Expand ticket details"
              }
            >
              {sidebarOpen ? (
                <ChevronLeft size={21} />
              ) : (
                <ChevronDown size={21} className="resource-admin-ticket-rotate-left" />
              )}
            </button>

            {sidebarOpen ? (
              <dl className="resource-admin-ticket-detail-meta-list">
                <Meta label="Status">
                  <span
                    className={`resource-admin-ticket-detail-tag resource-admin-ticket-detail-status-${statusSlug(
                      ticket.status,
                    )}`}
                  >
                    {statusLabel}
                  </span>
                </Meta>

                <Meta label="Priority">
                  <span
                    className={`resource-admin-ticket-detail-tag resource-admin-ticket-detail-priority-${prioritySlug(
                      ticket.priority,
                    )}`}
                  >
                    {ticket.priority}
                  </span>
                </Meta>

                <Meta label="Ticket Type">
                  <span
                    className={`resource-admin-ticket-detail-type resource-admin-ticket-detail-type-${typeSlug(
                      ticket.type,
                    )}`}
                  >
                    {ticket.type}
                  </span>
                </Meta>

                <Meta label="Project" value={ticket.project || "Not set"} />
                <Meta label="Assignee" value={ticket.assignee || "Not set"} />
                <Meta label="Created By" value={ticket.reporter || "Not set"} />
                <Meta label="Due Date" value={formatDate(ticket.dueDate)} />
                <Meta label="Created Date" value={formatDate(ticket.createdAt)} />
                <Meta label="Last Updated" value={formatDate(ticket.updatedAt)} />
              </dl>
            ) : null}
          </aside>

          <main className="resource-admin-ticket-detail-main">
            <section>
              <h2 className="resource-admin-ticket-detail-heading">{ticket.title}</h2>

              <div className="resource-admin-ticket-detail-section-title">
                <h3>Description</h3>
              </div>
              <div className="resource-admin-ticket-detail-body resource-admin-ticket-description">
                {ticket.description || "No description has been added to this ticket."}
              </div>
            </section>

            <section className="resource-admin-ticket-detail-section">
              <h3 className="resource-admin-ticket-detail-subheading">Attachments</h3>
              <div className="resource-admin-ticket-attachment-previews">
                {ticket.attachments.slice(0, 5).map((file) => (
                  <AttachmentPreview
                    key={file.id}
                    name={file.name}
                    url={file.url}
                    image={file.mimeType.startsWith("image/")}
                  />
                ))}
                {!ticket.attachments.length ? (
                  <span className="resource-admin-ticket-detail-muted">
                    No attachments uploaded.
                  </span>
                ) : null}
              </div>
            </section>

            <section className="resource-admin-ticket-detail-section">
              <h3 className="resource-admin-ticket-detail-subheading">URL Links</h3>

              <div className="resource-admin-ticket-url-list">
                {ticket.links.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <Link2 size={16} />
                    <span>{url}</span>
                    <ExternalLink size={15} />
                  </a>
                ))}
                {!ticket.links.length ? (
                  <span className="resource-admin-ticket-detail-muted">
                    No URL links have been added.
                  </span>
                ) : null}
              </div>

              {ticket.permissions?.canAddLink ? (
                <div className="resource-admin-ticket-add-link">
                  <input
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    disabled={busy || !link.trim()}
                    onClick={async () => {
                      if (await patch({ action: "addLink", url: link })) {
                        setLink("");
                      }
                    }}
                  >
                    Add Link
                  </button>
                </div>
              ) : null}
            </section>

            <section className="resource-admin-ticket-detail-section">
              <h3 className="resource-admin-ticket-detail-subheading">Comments</h3>

              <div className="resource-admin-ticket-comments-panel">
                <div className="resource-admin-ticket-comments-tabs">
                  <button
                    type="button"
                    className={tab === "chat" ? "active" : ""}
                    onClick={() => setTab("chat")}
                  >
                    Chat Details
                  </button>
                  <button
                    type="button"
                    className={tab === "media" ? "active" : ""}
                    onClick={() => setTab("media")}
                  >
                    Media
                  </button>
                </div>

                {tab === "chat" ? (
                  <div className="resource-admin-ticket-chat-area">
                    <div className="resource-admin-ticket-chat-messages">
                      {ticket.comments?.map((item, index) => (
                        <div
                          key={item.id}
                          className={
                            index % 2
                              ? "resource-admin-ticket-chat-row is-right"
                              : "resource-admin-ticket-chat-row"
                          }
                        >
                          <div className="resource-admin-ticket-chat-bubble">
                            <div>
                              <strong>{item.user}</strong>
                              <time>{formatDateTime(item.createdAt)}</time>
                            </div>
                            <p>{item.content}</p>
                          </div>
                        </div>
                      ))}

                      {!ticket.comments?.length ? (
                        <div className="resource-admin-ticket-chat-empty">
                          No comments yet.
                        </div>
                      ) : null}
                    </div>

                    {ticket.permissions?.canComment ? (
                      <div className="resource-admin-ticket-chat-composer">
                        <button
                          type="button"
                          className="resource-admin-ticket-detail-row-icon"
                          disabled={!ticket.permissions?.canUpload || busy}
                          onClick={() => fileInput.current?.click()}
                          aria-label="Attach files"
                        >
                          <Paperclip size={19} />
                        </button>

                        <textarea
                          ref={commentInput}
                          rows={2}
                          value={comment}
                          onChange={(event) => setComment(event.target.value)}
                          placeholder="Write a comment..."
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              if (comment.trim()) {
                                void patch({
                                  action: "comment",
                                  content: comment,
                                }).then((saved) => {
                                  if (saved) setComment("");
                                });
                              }
                            }
                          }}
                        />

                        <button
                          type="button"
                          className="resource-admin-ticket-send-button"
                          disabled={busy || !comment.trim()}
                          onClick={async () => {
                            if (
                              await patch({
                                action: "comment",
                                content: comment,
                              })
                            ) {
                              setComment("");
                            }
                          }}
                          aria-label="Send comment"
                        >
                          <Send size={18} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="resource-admin-ticket-media-area">
                    <MediaSection title="Photos and videos">
                      {images.length ? (
                        <div className="resource-admin-ticket-media-images">
                          {images.slice(0, 5).map((file) => (
                            <a
                              key={file.id}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              title={file.name}
                            >
                              <FileImage size={22} />
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="resource-admin-ticket-detail-muted">
                          No photos or videos.
                        </span>
                      )}
                    </MediaSection>

                    <MediaSection title="Documents">
                      {documents.slice(0, 3).map((file) => (
                        <MediaRow
                          key={file.id}
                          icon={<FileText size={18} />}
                          title={file.name}
                          meta={`${Math.ceil(file.size / 1024)} KB · ${formatDate(
                            file.uploadedAt,
                          )}`}
                          href={file.url}
                        />
                      ))}
                      {!documents.length ? (
                        <span className="resource-admin-ticket-detail-muted">
                          No documents.
                        </span>
                      ) : null}
                    </MediaSection>

                    <MediaSection title="Links">
                      {ticket.links.slice(0, 3).map((url) => (
                        <MediaRow
                          key={url}
                          icon={<Link2 size={18} />}
                          title={url}
                          meta="External link"
                          href={url}
                        />
                      ))}
                      {!ticket.links.length ? (
                        <span className="resource-admin-ticket-detail-muted">
                          No links.
                        </span>
                      ) : null}
                    </MediaSection>
                  </div>
                )}
              </div>
            </section>

            <section className="resource-admin-ticket-activity-section">
              <h3 className="resource-admin-ticket-detail-subheading">
                Activity History
              </h3>
              <ul className="resource-admin-ticket-activity-summary">
                {ticket.activities?.map((item) => (
                  <li key={item.id}>
                    <strong>{item.action}</strong>
                    <span>
                      {item.user}
                      {item.status ? ` · ${item.status}` : ""} · {formatDateTime(item.createdAt)}
                    </span>
                  </li>
                ))}
                {!ticket.activities?.length ? (
                  <li>No activity recorded.</li>
                ) : null}
              </ul>
            </section>
          </main>
        </div>

        <input
          ref={fileInput}
          type="file"
          multiple
          className="resource-admin-ticket-hidden-input"
          onChange={(event) => {
            void upload(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {modal === "status" ? (
        <div
          className="resource-admin-ticket-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="resource-ticket-status-modal-title"
            className="resource-admin-ticket-modal"
          >
            <div className="resource-admin-ticket-modal-header">
              <h2 id="resource-ticket-status-modal-title">Change Status</h2>
              <button type="button" onClick={() => setModal(null)} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <div className="resource-admin-ticket-status-choice-grid">
              {resourceStatuses.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={statusDraft === item.value ? "is-selected" : ""}
                  onClick={() => setStatusDraft(item.value)}
                >
                  <span
                    className={`resource-admin-ticket-detail-tag resource-admin-ticket-detail-status-${statusSlug(
                      item.value,
                    )}`}
                  >
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="resource-admin-ticket-modal-actions">
              <button
                type="button"
                className="resource-admin-ticket-detail-secondary-button"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="resource-admin-ticket-detail-primary-button"
                disabled={busy || statusDraft === ticket.status}
                onClick={async () => {
                  if (
                    await patch({
                      action: "status",
                      status: statusDraft,
                    })
                  ) {
                    setModal(null);
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modal === "edit" ? (
        <div
          className="resource-admin-ticket-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="resource-ticket-edit-modal-title"
            className="resource-admin-ticket-modal resource-admin-ticket-edit-modal"
          >
            <div className="resource-admin-ticket-modal-header">
              <div>
                <h2 id="resource-ticket-edit-modal-title">Edit Ticket Details</h2>
                <p>Resource users can edit ticket content and due date only.</p>
              </div>
              <button type="button" onClick={() => setModal(null)} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <label className="resource-admin-ticket-modal-field">
              <span>Ticket title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <label className="resource-admin-ticket-modal-field">
              <span>Description</span>
              <textarea
                rows={7}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <label className="resource-admin-ticket-modal-field">
              <span>Due Date</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>

            <div className="resource-admin-ticket-modal-actions">
              <button
                type="button"
                className="resource-admin-ticket-detail-secondary-button"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="resource-admin-ticket-detail-primary-button"
                disabled={busy}
                onClick={async () => {
                  if (
                    await patch({
                      action: "edit",
                      title,
                      description,
                      dueDate,
                    })
                  ) {
                    setModal(null);
                  }
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <TicketDetailStyles />
    </>
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
      <dt>{label}</dt>
      <dd>{children ?? value}</dd>
    </div>
  );
}

function AttachmentPreview({
  name,
  url,
  image,
}: {
  name: string;
  url: string;
  image: boolean;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="resource-admin-ticket-attachment-preview"
    >
      <span>{image ? <FileImage size={22} /> : <File size={22} />}</span>
      <small title={name}>{name}</small>
    </a>
  );
}

function MediaSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="resource-admin-ticket-media-section">
      <h4>{title}</h4>
      <div>{children}</div>
    </section>
  );
}

function MediaRow({
  icon,
  title,
  meta,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="resource-admin-ticket-media-row"
    >
      <span className="resource-admin-ticket-media-row-icon">{icon}</span>
      <span className="resource-admin-ticket-media-row-copy">
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
      <ExternalLink size={16} />
    </a>
  );
}

function TicketDetailStyles() {
  return (
    <style>{`
      .resource-admin-ticket-detail-page {
        color: #475467;
        font-family: Geist, var(--font-inter), Inter, Arial, sans-serif;
      }

      .resource-admin-ticket-detail-header {
        position: sticky;
        z-index: 30;
        top: 0;
        display: flex;
        margin: 0 -8px;
        flex-direction: column;
        gap: 20px;
        border-bottom: 1px solid #f1f5f9;
        background: rgba(255, 255, 255, 0.95);
        padding: 12px 8px;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      .resource-admin-ticket-detail-header h1 {
        margin: 0;
        color: #101828;
        font-family: Satoshi, Geist, Arial, sans-serif;
        font-size: 32px;
        font-weight: 700;
        line-height: 40px;
      }

      .resource-admin-ticket-detail-primary-button,
      .resource-admin-ticket-detail-secondary-button {
        display: inline-flex;
        min-height: 44px;
        align-items: center;
        justify-content: center;
        gap: 9px;
        border-radius: 10px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
      }

      .resource-admin-ticket-detail-primary-button {
        border: 0;
        background: linear-gradient(105deg, #078dcc, #20c9d8);
        color: #ffffff;
        box-shadow: 0 4px 10px rgba(14, 165, 233, 0.16);
      }

      .resource-admin-ticket-detail-primary-button:hover:not(:disabled) {
        filter: brightness(0.96);
        transform: translateY(-1px);
      }

      .resource-admin-ticket-detail-primary-button:disabled,
      .resource-admin-ticket-detail-secondary-button:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .resource-admin-ticket-detail-secondary-button {
        border: 1px solid #06b6d4;
        background: #ffffff;
        color: #0284c7;
      }

      .resource-admin-ticket-detail-secondary-button:hover {
        background: #e6f8fb;
      }

      .resource-admin-ticket-detail-error {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 18px;
        border: 1px solid #fecaca;
        border-radius: 8px;
        background: #fef2f2;
        padding: 12px 14px;
        color: #dc2626;
        font-size: 14px;
        font-weight: 600;
      }

      .resource-admin-ticket-detail-error button {
        display: grid;
        width: 30px;
        height: 30px;
        place-items: center;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: inherit;
        cursor: pointer;
      }

      .resource-admin-ticket-detail-actions-wrap {
        display: flex;
        margin-top: 32px;
        justify-content: flex-end;
      }

      .resource-admin-ticket-detail-action-row {
        display: flex;
        max-width: 100%;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
      }

      .resource-admin-ticket-detail-action-button {
        display: inline-flex;
        min-height: 44px;
        align-items: center;
        justify-content: center;
        gap: 7px;
        white-space: nowrap;
        border: 1px solid #d0d5dd;
        border-radius: 9px;
        background: #ffffff;
        padding: 10px 16px;
        color: #344054;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
        cursor: pointer;
      }

      .resource-admin-ticket-detail-action-button:hover:not(:disabled) {
        background: #f9fafb;
        color: #0284c7;
      }

      .resource-admin-ticket-detail-action-button:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .resource-admin-ticket-detail-more-wrap {
        position: relative;
      }

      .resource-admin-ticket-detail-more-menu {
        position: absolute;
        z-index: 40;
        top: calc(100% + 7px);
        right: 0;
        display: grid;
        width: 208px;
        border: 1px solid #e4e7ec;
        border-radius: 10px;
        background: #ffffff;
        padding: 6px;
        box-shadow: 0 12px 28px rgba(16, 24, 40, 0.15);
      }

      .resource-admin-ticket-detail-more-menu button {
        border: 0;
        border-radius: 6px;
        background: transparent;
        padding: 10px 12px;
        color: #475467;
        font: inherit;
        font-size: 13px;
        text-align: left;
        cursor: pointer;
      }

      .resource-admin-ticket-detail-more-menu button:hover {
        background: #f2f4f7;
        color: #0284c7;
      }

      .resource-admin-ticket-detail-layout {
        display: grid;
        min-width: 0;
        margin-top: 28px;
      }

      .resource-admin-ticket-detail-sidebar {
        position: relative;
        min-height: 100%;
        border-right: 1px solid #e4e7ec;
        padding: 0 16px 32px 0;
      }

      .resource-admin-ticket-detail-sidebar-toggle {
        position: absolute;
        z-index: 10;
        top: 0;
        right: 12px;
        display: grid;
        width: 32px;
        height: 32px;
        place-items: center;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: #344054;
        cursor: pointer;
      }

      .resource-admin-ticket-detail-sidebar-toggle:hover {
        background: #e6f8fb;
        color: #0284c7;
      }

      .resource-admin-ticket-rotate-left {
        transform: rotate(-90deg);
      }

      .resource-admin-ticket-detail-meta-list {
        display: flex;
        margin: 0;
        padding: 0 28px 0 0;
        flex-direction: column;
        gap: 16px;
      }

      .resource-admin-ticket-detail-meta-list dt {
        color: #101828;
        font-size: 16px;
        font-weight: 600;
        line-height: 24px;
      }

      .resource-admin-ticket-detail-meta-list dd {
        margin: 2px 0 0;
        color: #475467;
        font-size: 16px;
        line-height: 24px;
        overflow-wrap: anywhere;
      }

      .resource-admin-ticket-detail-main {
        min-width: 0;
        padding: 28px 0 0;
      }

      .resource-admin-ticket-detail-heading {
        margin: 0;
        color: #101828;
        font-family: Satoshi, Geist, Arial, sans-serif;
        font-size: 24px;
        font-weight: 700;
        line-height: 32px;
      }

      .resource-admin-ticket-detail-section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 28px;
      }

      .resource-admin-ticket-detail-subheading,
      .resource-admin-ticket-detail-section-title h3 {
        margin: 0;
        color: #101828;
        font-size: 16px;
        font-weight: 600;
        line-height: 24px;
      }

      .resource-admin-ticket-detail-body {
        color: #475467;
        font-size: 16px;
        font-weight: 400;
        line-height: 24px;
      }

      .resource-admin-ticket-description {
        margin-top: 8px;
        white-space: pre-wrap;
      }

      .resource-admin-ticket-detail-section {
        margin-top: 28px;
      }

      .resource-admin-ticket-detail-muted {
        color: #98a2b3;
        font-size: 13px;
      }

      .resource-admin-ticket-detail-tag,
      .resource-admin-ticket-detail-type {
        display: inline-flex;
        min-width: 102px;
        justify-content: center;
        border: 1px solid transparent;
        border-radius: 9999px;
        padding: 4px 11px;
        font-size: 12px;
        font-weight: 500;
        line-height: 18px;
      }

      .resource-admin-ticket-detail-status-open {
        border-color: #6d28d9;
        background: #7c3aed;
        color: #ffffff;
      }

      .resource-admin-ticket-detail-status-reviewed {
        border-color: #1e293b;
        background: #334155;
        color: #ffffff;
      }

      .resource-admin-ticket-detail-status-assigned,
      .resource-admin-ticket-detail-status-validation {
        border-color: #1d4ed8;
        background: #2563eb;
        color: #ffffff;
      }

      .resource-admin-ticket-detail-status-active {
        border-color: #0f766e;
        background: #0d9488;
        color: #ffffff;
      }

      .resource-admin-ticket-detail-status-blocked {
        border-color: #c2410c;
        background: #ea580c;
        color: #ffffff;
      }

      .resource-admin-ticket-detail-status-awaiting {
        border-color: #be185d;
        background: #db2777;
        color: #ffffff;
      }

      .resource-admin-ticket-detail-status-qa,
      .resource-admin-ticket-detail-status-resolved {
        border-color: #15803d;
        background: #16a34a;
        color: #ffffff;
      }

      .resource-admin-ticket-detail-status-closed {
        border-color: #374151;
        background: #4b5563;
        color: #ffffff;
      }

      .resource-admin-ticket-detail-status-reopened {
        border-color: #b91c1c;
        background: #dc2626;
        color: #ffffff;
      }

      .resource-admin-ticket-detail-status-cancelled {
        border-color: #6b7280;
        background: #9ca3af;
        color: #ffffff;
      }

      .resource-admin-ticket-detail-priority-critical {
        border-color: #b91c1c;
        background: #dc2626;
        color: #ffffff;
      }

      .resource-admin-ticket-detail-priority-high {
        border-color: #c2410c;
        background: #ea580c;
        color: #ffffff;
      }

      .resource-admin-ticket-detail-priority-medium {
        border-color: #a16207;
        background: #ca8a04;
        color: #ffffff;
      }

      .resource-admin-ticket-detail-priority-low {
        border-color: #15803d;
        background: #16a34a;
        color: #ffffff;
      }

      .resource-admin-ticket-detail-priority-not-assigned {
        border-color: #6b7280;
        background: #9ca3af;
        color: #ffffff;
      }

      .resource-admin-ticket-detail-type {
        border-color: #bfdbfe;
        background: #eff6ff;
        color: #1d4ed8;
      }

      .resource-admin-ticket-detail-type-bug,
      .resource-admin-ticket-detail-type-urgent-fix,
      .resource-admin-ticket-detail-type-system-down {
        border-color: #fecaca;
        background: #fef2f2;
        color: #b91c1c;
      }

      .resource-admin-ticket-detail-type-feedback {
        border-color: #fed7aa;
        background: #fff7ed;
        color: #c2410c;
      }

      .resource-admin-ticket-detail-type-technical-issue {
        border-color: #fde68a;
        background: #fffbeb;
        color: #a16207;
      }

      .resource-admin-ticket-detail-type-new-feature,
      .resource-admin-ticket-detail-type-change-request {
        border-color: #ddd6fe;
        background: #f5f3ff;
        color: #6d28d9;
      }

      .resource-admin-ticket-detail-type-support-request {
        border-color: #99f6e4;
        background: #f0fdfa;
        color: #0f766e;
      }

      .resource-admin-ticket-detail-type-ui-ux-issue {
        border-color: #fbcfe8;
        background: #fdf2f8;
        color: #be185d;
      }

      .resource-admin-ticket-attachment-previews {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 12px;
      }

      .resource-admin-ticket-attachment-preview {
        display: block;
        width: 112px;
        color: #64748b;
        text-align: left;
        text-decoration: none;
      }

      .resource-admin-ticket-attachment-preview > span {
        display: grid;
        height: 64px;
        place-items: center;
        overflow: hidden;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: linear-gradient(135deg, #f8fafc, #f0f9ff);
        color: #0ea5e9;
      }

      .resource-admin-ticket-attachment-preview small {
        display: block;
        margin-top: 5px;
        overflow: hidden;
        color: #64748b;
        font-size: 12px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .resource-admin-ticket-attachment-preview:hover small {
        color: #0284c7;
      }

      .resource-admin-ticket-url-list {
        display: flex;
        margin-top: 12px;
        flex-direction: column;
        gap: 8px;
      }

      .resource-admin-ticket-url-list a {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 8px;
        color: #475467;
        font-size: 14px;
        text-decoration: underline;
      }

      .resource-admin-ticket-url-list a span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .resource-admin-ticket-url-list a:hover {
        color: #0284c7;
      }

      .resource-admin-ticket-add-link {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .resource-admin-ticket-add-link input,
      .resource-admin-ticket-chat-composer textarea,
      .resource-admin-ticket-modal-field input,
      .resource-admin-ticket-modal-field textarea {
        width: 100%;
        min-height: 46px;
        border: 1px solid #d8dee7;
        border-radius: 8px;
        background: #ffffff;
        padding: 11px 13px;
        color: #0f172a;
        font: inherit;
        font-size: 14px;
        outline: none;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
      }

      .resource-admin-ticket-add-link input:focus,
      .resource-admin-ticket-chat-composer textarea:focus,
      .resource-admin-ticket-modal-field input:focus,
      .resource-admin-ticket-modal-field textarea:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
      }

      .resource-admin-ticket-add-link button {
        min-width: 96px;
        border: 1px solid #06b6d4;
        border-radius: 8px;
        background: #ffffff;
        color: #0284c7;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }

      .resource-admin-ticket-add-link button:hover:not(:disabled) {
        background: #e6f8fb;
      }

      .resource-admin-ticket-add-link button:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .resource-admin-ticket-comments-panel {
        overflow: hidden;
        margin-top: 12px;
        border: 1px solid #e4e7ec;
        border-radius: 10px;
        background: #fcfcfd;
      }

      .resource-admin-ticket-comments-tabs {
        display: flex;
        height: 48px;
        border-bottom: 1px solid #e4e7ec;
      }

      .resource-admin-ticket-comments-tabs button {
        min-width: 208px;
        border: 0;
        border-bottom: 2px solid transparent;
        background: transparent;
        color: #667085;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }

      .resource-admin-ticket-comments-tabs button.active {
        border-color: #0ea5e9;
        background: #e6f8fb;
        color: #0284c7;
      }

      .resource-admin-ticket-chat-area {
        background: #f9fafb;
      }

      .resource-admin-ticket-chat-messages {
        max-height: 430px;
        overflow-y: auto;
        padding: 20px;
      }

      .resource-admin-ticket-chat-row {
        display: flex;
        margin-bottom: 20px;
      }

      .resource-admin-ticket-chat-row:last-child {
        margin-bottom: 0;
      }

      .resource-admin-ticket-chat-row.is-right {
        justify-content: flex-end;
      }

      .resource-admin-ticket-chat-bubble {
        max-width: 78%;
        border-radius: 16px 16px 16px 4px;
        background: #f1f5f9;
        padding: 12px 16px;
      }

      .resource-admin-ticket-chat-row.is-right .resource-admin-ticket-chat-bubble {
        border-radius: 16px 16px 4px 16px;
        background: #e6f8fb;
      }

      .resource-admin-ticket-chat-bubble > div {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }

      .resource-admin-ticket-chat-bubble strong {
        color: #101828;
        font-size: 14px;
      }

      .resource-admin-ticket-chat-bubble time {
        color: #98a2b3;
        font-size: 11px;
      }

      .resource-admin-ticket-chat-bubble p {
        margin: 0;
        color: #475467;
        font-size: 14px;
        line-height: 21px;
        white-space: pre-wrap;
      }

      .resource-admin-ticket-chat-empty {
        padding: 32px;
        text-align: center;
        color: #98a2b3;
        font-size: 13px;
      }

      .resource-admin-ticket-chat-composer {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        border-top: 1px solid #e2e8f0;
        padding: 12px;
      }

      .resource-admin-ticket-chat-composer textarea {
        min-height: 64px;
        resize: none;
      }

      .resource-admin-ticket-detail-row-icon {
        display: grid;
        width: 34px;
        height: 34px;
        flex: 0 0 34px;
        place-items: center;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: #475569;
        cursor: pointer;
      }

      .resource-admin-ticket-detail-row-icon:hover:not(:disabled) {
        background: #e6f8fb;
        color: #0284c7;
      }

      .resource-admin-ticket-detail-row-icon:disabled {
        cursor: not-allowed;
        opacity: 0.4;
      }

      .resource-admin-ticket-send-button {
        display: grid;
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        place-items: center;
        border: 0;
        border-radius: 12px;
        background: #0284c7;
        color: #ffffff;
        cursor: pointer;
      }

      .resource-admin-ticket-send-button:hover:not(:disabled) {
        background: #0369a1;
      }

      .resource-admin-ticket-send-button:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .resource-admin-ticket-media-area {
        display: flex;
        flex-direction: column;
        gap: 20px;
        padding: 16px;
      }

      .resource-admin-ticket-media-section h4 {
        margin: 0 0 8px;
        color: #334155;
        font-size: 14px;
        font-weight: 600;
      }

      .resource-admin-ticket-media-images {
        display: flex;
        gap: 8px;
        overflow: hidden;
      }

      .resource-admin-ticket-media-images a {
        display: grid;
        width: 80px;
        height: 80px;
        flex: 0 0 80px;
        place-items: center;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: linear-gradient(135deg, #f0f9ff, #f1f5f9);
        color: #0ea5e9;
      }

      .resource-admin-ticket-media-images a:hover {
        border-color: #7dd3fc;
      }

      .resource-admin-ticket-media-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: #ffffff;
        padding: 12px 16px;
        color: #475569;
        text-decoration: none;
      }

      .resource-admin-ticket-media-row:last-child {
        margin-bottom: 0;
      }

      .resource-admin-ticket-media-row:hover {
        border-color: #7dd3fc;
        background: #f0f9ff;
      }

      .resource-admin-ticket-media-row-icon {
        display: grid;
        width: 36px;
        height: 36px;
        flex: 0 0 36px;
        place-items: center;
        color: #64748b;
      }

      .resource-admin-ticket-media-row-copy {
        min-width: 0;
        flex: 1;
      }

      .resource-admin-ticket-media-row-copy strong,
      .resource-admin-ticket-media-row-copy small {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .resource-admin-ticket-media-row-copy strong {
        color: #334155;
        font-size: 14px;
        font-weight: 500;
      }

      .resource-admin-ticket-media-row-copy small {
        color: #64748b;
        font-size: 12px;
      }

      .resource-admin-ticket-activity-section {
        margin: 32px 0 16px;
      }

      .resource-admin-ticket-activity-summary {
        margin: 12px 0 0;
        padding-left: 24px;
        color: #475467;
        font-size: 16px;
        line-height: 24px;
        list-style: disc;
      }

      .resource-admin-ticket-activity-summary li {
        margin-bottom: 8px;
      }

      .resource-admin-ticket-activity-summary strong,
      .resource-admin-ticket-activity-summary span {
        display: block;
      }

      .resource-admin-ticket-activity-summary strong {
        color: #344054;
        font-size: 14px;
      }

      .resource-admin-ticket-activity-summary span {
        color: #667085;
        font-size: 12px;
      }

      .resource-admin-ticket-hidden-input {
        display: none;
      }

      .resource-admin-ticket-modal-backdrop {
        position: fixed;
        z-index: 80;
        inset: 0;
        display: grid;
        place-items: center;
        background: rgba(15, 23, 42, 0.38);
        padding: 16px;
      }

      .resource-admin-ticket-modal {
        width: min(620px, 100%);
        border-radius: 13px;
        background: #ffffff;
        padding: 22px;
        box-shadow: 0 24px 50px rgba(15, 23, 42, 0.24);
      }

      .resource-admin-ticket-edit-modal {
        max-height: 90vh;
        overflow-y: auto;
      }

      .resource-admin-ticket-modal-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .resource-admin-ticket-modal-header h2 {
        margin: 0;
        color: #334155;
        font-family: Satoshi, Geist, Arial, sans-serif;
        font-size: 26px;
        font-weight: 700;
      }

      .resource-admin-ticket-modal-header p {
        margin: 4px 0 0;
        color: #64748b;
        font-size: 13px;
      }

      .resource-admin-ticket-modal-header > button {
        display: grid;
        width: 34px;
        height: 34px;
        place-items: center;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: #475569;
        cursor: pointer;
      }

      .resource-admin-ticket-modal-header > button:hover {
        background: #e6f8fb;
        color: #0284c7;
      }

      .resource-admin-ticket-status-choice-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 24px;
      }

      .resource-admin-ticket-status-choice-grid > button {
        display: flex;
        min-height: 52px;
        align-items: center;
        justify-content: center;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #ffffff;
        padding: 8px;
        cursor: pointer;
      }

      .resource-admin-ticket-status-choice-grid > button:hover,
      .resource-admin-ticket-status-choice-grid > button.is-selected {
        border-color: #0ea5e9;
        background: #f0f9ff;
      }

      .resource-admin-ticket-modal-field {
        display: block;
        margin-top: 18px;
      }

      .resource-admin-ticket-modal-field > span {
        display: block;
        margin-bottom: 7px;
        color: #334155;
        font-size: 14px;
        font-weight: 700;
      }

      .resource-admin-ticket-modal-field textarea {
        resize: vertical;
      }

      .resource-admin-ticket-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 24px;
      }

      @media (min-width: 640px) {
        .resource-admin-ticket-detail-header {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }
      }

      @media (min-width: 1024px) {
        .resource-admin-ticket-detail-layout.sidebar-open {
          grid-template-columns: 320px minmax(0, 1fr);
        }

        .resource-admin-ticket-detail-layout.sidebar-closed {
          grid-template-columns: 56px minmax(0, 1fr);
        }

        .resource-admin-ticket-detail-main {
          padding: 0 0 0 32px;
        }
      }

      @media (max-width: 1023px) {
        .resource-admin-ticket-detail-sidebar {
          min-height: auto;
          border-right: 0;
          border-bottom: 1px solid #e4e7ec;
          padding: 0 48px 24px 0;
        }

        .resource-admin-ticket-detail-main {
          padding-top: 28px;
        }

        .resource-admin-ticket-detail-action-row {
          max-width: 100%;
          overflow-x: auto;
          justify-content: flex-start;
          padding-bottom: 4px;
        }
      }

      @media (max-width: 640px) {
        .resource-admin-ticket-comments-tabs button {
          min-width: 0;
          flex: 1;
        }

        .resource-admin-ticket-add-link,
        .resource-admin-ticket-chat-composer,
        .resource-admin-ticket-modal-actions {
          align-items: stretch;
          flex-direction: column;
        }

        .resource-admin-ticket-send-button,
        .resource-admin-ticket-detail-row-icon {
          width: 100%;
        }

        .resource-admin-ticket-status-choice-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
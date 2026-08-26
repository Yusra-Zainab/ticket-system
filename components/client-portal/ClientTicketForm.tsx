"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  Camera,
  ChevronDown,
  Clock3,
  File,
  FileText,
  HardDrive,
  MapPin,
  MessageSquare,
  MinusCircle,
  MonitorUp,
  Paperclip,
  PlusCircle,
  RotateCcw,
  Save,
  Send,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import RichTextEditor from "@/components/ui/RichTextEditor";
import { cn } from "@/lib/utils";
import type {
  ClientPortalProject,
  ClientPortalTicket,
  ClientTicketType,
} from "@/types/clientPortal";

const tagStyles = {
  red: "bg-red-50 text-red-700 ring-red-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  teal: "bg-teal-50 text-teal-700 ring-teal-200",
  pink: "bg-pink-50 text-pink-700 ring-pink-200",
  green: "bg-green-50 text-green-700 ring-green-200",
  slate: "bg-slate-50 text-slate-700 ring-slate-200",
} as const;

const ticketTypeOptions: Array<{
  label: ClientTicketType;
  detail: string;
  color: string;
}> = [
  { label: "Bug", detail: "Something isn't working", color: tagStyles.red },
  { label: "Feedback", detail: "Suggestion or opinion", color: tagStyles.orange },
  { label: "Technical Issue", detail: "Technical problem", color: tagStyles.amber },
  { label: "New Feature", detail: "Request new functionality", color: tagStyles.violet },
  { label: "Task", detail: "General work request", color: tagStyles.blue },
  { label: "Support Request", detail: "Help or assistance needed", color: tagStyles.teal },
  { label: "UI/UX Issue", detail: "Design or usability problem", color: tagStyles.pink },
  { label: "Change Request", detail: "Request a controlled change", color: tagStyles.violet },
  { label: "Content Update", detail: "Update content or copy", color: tagStyles.green },
  { label: "Testing / QA", detail: "Testing or quality assurance", color: tagStyles.teal },
  { label: "Maintenance", detail: "Maintenance work", color: tagStyles.slate },
  { label: "Urgent Fix", detail: "Urgent corrective work", color: tagStyles.orange },
  { label: "System Down", detail: "Service or system unavailable", color: tagStyles.red },
];

type SectionId =
  | "project"
  | "basic"
  | "attachments"
  | "priority"
  | "assignment"
  | "notes";

type SectionDefinition = {
  id: SectionId;
  title: string;
  detail?: string;
  icon: LucideIcon;
};

const sections: SectionDefinition[] = [
  {
    id: "project",
    title: "Project Details",
    detail: "Select project, module, and link.",
    icon: MapPin,
  },
  { id: "basic", title: "Basic Ticket Information", icon: FileText },
  { id: "attachments", title: "Attachments & References", icon: Paperclip },
  { id: "priority", title: "Priority & Timeline", icon: Clock3 },
  { id: "assignment", title: "Assignment", icon: UserRound },
  { id: "notes", title: "Internal Notes", icon: MessageSquare },
];
type ConfirmMode = "reset" | "save" | "submit";

type FormErrors = {
  project?: string;
  title?: string;
  description?: string;
};

function plainLength(value: string) {
  return value.replace(/<[^>]*>/g, "").trim().length;
}

function richTextToPlain(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/^https?:\/\//i, "");
}

export default function ClientTicketForm({
  projects,
  initialTicket,
  initialProjectId = "",
}: {
  projects: ClientPortalProject[];
  initialTicket?: ClientPortalTicket;
  initialProjectId?: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const initialProject = initialTicket?.projectId || initialProjectId;
  const initialTitle =
    initialTicket?.title === "Untitled ticket" ? "" : initialTicket?.title || "";
  const initialType = initialTicket?.type || "Task";
  const initialDescription = initialTicket?.description || "";
  const initialDueDate = initialTicket?.dueDate || "";
  const initialUrls = initialTicket?.links?.length
    ? initialTicket.links.map(normalizeUrl)
    : [""];

  const [active, setActive] = useState<SectionId>("project");
  const [projectId, setProjectId] = useState(initialProject);
  const [title, setTitle] = useState(initialTitle);
  const [type, setType] = useState<ClientTicketType>(initialType);
  const [description, setDescription] = useState(initialDescription);
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadMenu, setUploadMenu] = useState(false);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>();
  const [saving, setSaving] = useState<"DRAFT" | "OPEN" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({ title: false, description: false });

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projects, projectId],
  );

  const projectName = selectedProject?.name || "";
  const createdBy = initialTicket?.reporter || "Current client";

  const savedUrls = urls
    .map((value) => normalizeUrl(value))
    .filter(Boolean)
    .map((value) => `https://${value}`);

  const isDirty = useMemo(() => {
    return (
      projectId !== initialProject ||
      title !== initialTitle ||
      type !== initialType ||
      description !== initialDescription ||
      dueDate !== initialDueDate ||
      pendingFiles.length > 0 ||
      JSON.stringify(urls.map(normalizeUrl)) !== JSON.stringify(initialUrls.map(normalizeUrl))
    );
  }, [
    description,
    dueDate,
    initialDescription,
    initialDueDate,
    initialProject,
    initialTitle,
    initialType,
    initialUrls,
    pendingFiles.length,
    projectId,
    title,
    type,
    urls,
  ]);

  function jump(id: SectionId) {
    setActive(id);
    document
      .getElementById(`client-ticket-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetForm() {
    setProjectId(initialProject);
    setTitle(initialTitle);
    setType(initialType);
    setDescription(initialDescription);
    setDueDate(initialDueDate);
    setUrls(initialUrls);
    setPendingFiles([]);
    setErrors({});
    setTouched({ title: false, description: false });
    setNotice("Form reset.");
    jump("project");
  }

  function validateSubmit() {
    const next: FormErrors = {};

    if (!projectId) {
      next.project = "Select a project";
    }

    if (title.trim().length < 5) {
      next.title = "Use at least 5 characters";
    } else if (title.trim().length > 200) {
      next.title = "Maximum 200 characters";
    }

    const descriptionLength = plainLength(description);
    if (descriptionLength > 1000) {
      next.description = "Maximum 1000 characters";
    }

    setErrors(next);

    if (next.project) {
      setNotice("Please correct the highlighted fields.");
      jump("project");
      return false;
    }

    if (next.title || next.description) {
      setNotice("Please correct the highlighted fields.");
      jump("basic");
      return false;
    }

    return true;
  }

  function requestSubmit(mode: "save" | "submit") {
    if (mode === "save") {
      setConfirmMode("save");
      return;
    }

    if (validateSubmit()) {
      setConfirmMode("submit");
    }
  }

  function queueFiles(incoming: File[]) {
    if (!incoming.length) return;

    const accepted = incoming.filter((file) => file.size <= 10 * 1024 * 1024);
    if (accepted.length !== incoming.length) {
      setNotice("Files larger than 10 MB were skipped.");
    }

    setPendingFiles((current) => {
      const existing = new Set(
        current.map((file) => `${file.name}:${file.size}:${file.lastModified}`),
      );

      return [
        ...current,
        ...accepted.filter(
          (file) =>
            !existing.has(`${file.name}:${file.size}:${file.lastModified}`),
        ),
      ];
    });

    if (accepted.length) {
      setNotice("Files are ready and will be uploaded when the ticket is saved.");
    }
    setUploadMenu(false);
  }

  async function captureScreenshot() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      stream.getTracks().forEach((track) => track.stop());

      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          queueFiles([
            new globalThis.File([blob], `screenshot-${Date.now()}.png`, {
              type: "image/png",
            }),
          ]);
        },
        "image/png",
      );
    } catch {
      setNotice(
        "Screenshot capture was cancelled or is not supported by this browser.",
      );
      setUploadMenu(false);
    }
  }

  async function uploadPendingFiles(ticketId: string) {
    if (!pendingFiles.length) return;

    setUploading(true);
    try {
      const upload = new FormData();
      pendingFiles.forEach((file) => upload.append("files", file, file.name));

      const response = await fetch(
        `/api/client-portal/tickets/${encodeURIComponent(ticketId)}/attachments`,
        { method: "POST", body: upload },
      );

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(body.error || "Unable to upload attachments.");
      }
    } finally {
      setUploading(false);
    }
  }

  async function save(lifecycle: "DRAFT" | "OPEN") {
    try {
      setSaving(lifecycle);
      setNotice("");

      const response = await fetch("/api/client-portal/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialTicket?.id,
          lifecycle,
          projectId,
          title: title.trim(),
          description: richTextToPlain(description),
          type,
          dueDate,
          urls: savedUrls,
              }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
      };

      if (!response.ok) {
        throw new Error(body.error || "Unable to save ticket.");
      }

      const ticketId = body.id || initialTicket?.id;
      if (!ticketId) {
        throw new Error("The ticket was saved without an id.");
      }

      await uploadPendingFiles(ticketId);

      router.push(
        lifecycle === "DRAFT"
          ? "/client-portal/tickets/drafts"
          : `/client-portal/tickets/${encodeURIComponent(ticketId)}`,
      );
      router.refresh();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Unable to save ticket.");
    } finally {
      setSaving(null);
      setConfirmMode(undefined);
    }
  }

  async function perform(mode: ConfirmMode) {
    if (mode === "reset") {
      setConfirmMode(undefined);
      resetForm();
      return;
    }

    setConfirmMode(undefined);
    await save(mode === "save" ? "DRAFT" : "OPEN");
  }

  const titleFieldClass = cn(
    "field",
    errors.title && "!border-red-500 !ring-red-100",
    touched.title && !errors.title && title.trim().length >= 5 && "!border-green-500 !ring-green-100",
  );

  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      className="ticket-create-page"
    >
      <header className="sticky top-0 z-30 -mx-3 mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-white/95 px-3 py-3 backdrop-blur">
        <h1 className="text-[2rem] font-bold tracking-tight text-slate-950">
          Create a Ticket
        </h1>

        <div className="flex flex-wrap gap-2">
          <Link href="/client-portal/tickets/drafts" className="button-secondary">
            Drafts
          </Link>

          <button
            type="button"
            onClick={() => setConfirmMode("reset")}
            className="button-secondary"
          >
            <RotateCcw size={16} />
            Reset
          </button>

          <button
            type="button"
            disabled={Boolean(saving) || uploading}
            onClick={() => requestSubmit("save")}
            className="button-secondary"
          >
            <Save size={16} />
            {saving === "DRAFT" ? "Saving..." : "Save Ticket"}
          </button>

          <button
            type="button"
            disabled={Boolean(saving) || uploading}
            onClick={() => requestSubmit("submit")}
            className="button-primary"
          >
            <Send size={16} />
            {saving === "OPEN" ? "Submitting..." : "Save and Submit Ticket"}
          </button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <ol className="relative space-y-1 before:absolute before:bottom-8 before:left-[27px] before:top-8 before:w-px before:bg-slate-300">
            {sections.map((section) => {
              const Icon = section.icon;
              const selected = active === section.id;

              return (
                <li className="relative z-10" key={section.id}>
                  <button
                    type="button"
                    onClick={() => jump(section.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-2 py-3 text-left",
                      selected
                        ? "text-sky-600"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-lg border bg-white",
                        selected
                          ? "border-sky-400 bg-sky-50"
                          : "border-slate-200",
                      )}
                    >
                      <Icon size={19} />
                    </span>

                    <span>
                      <strong className="block text-sm font-semibold">
                        {section.title}
                      </strong>
                      {section.detail ? (
                        <small className="mt-0.5 block text-xs">
                          {section.detail}
                        </small>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <main className="min-w-0 space-y-8">
          <FormSection
            id="project"
            title="Project Details"
            icon={MapPin}
            onEnter={setActive}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Project Name" required error={errors.project}>
                <SearchDropdown
                  value={projectName}
                  onChange={(_value, _url, id) => {
                    const nextProjectId = id || "";
                    setProjectId(nextProjectId);
                                    setErrors((current) => ({
                      ...current,
                      project: nextProjectId ? undefined : "Select a project",
                    }));
                  }}
                  placeholder="Select related project."
                  searchPlaceholder="Search Project"
                  validationState={
                    errors.project
                      ? "invalid"
                      : projectId
                        ? "valid"
                        : undefined
                  }
                  options={projects.map((project) => ({
                    label: project.name,
                    id: project.id,
                  }))}
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Module" required>
                <input
                  value={selectedProject?.moduleName || ""}
                  readOnly
                  className="field !bg-slate-50"
                  placeholder="Select project area."
                />
              </Field>

              <Field label="Sub Module" required>
                <input
                  value={selectedProject?.subModule || ""}
                  readOnly
                  className="field !bg-slate-50"
                  placeholder="Select specific section."
                />
              </Field>
            </div>

            <div>
              <span className="label">Related URL</span>
              <div className="space-y-2">
                {urls.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="field !w-20 shrink-0 !bg-slate-50">
                      https://
                    </span>
                    <input
                      type="text"
                      className="field"
                      value={url}
                      onChange={(event) =>
                        setUrls((items) =>
                          items.map((item, itemIndex) =>
                            itemIndex === index ? event.target.value : item,
                          ),
                        )
                      }
                      placeholder="www.example.com"
                    />

                    {urls.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setUrls((items) =>
                            items.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        className="text-red-500"
                        aria-label="Remove URL"
                      >
                        <MinusCircle />
                      </button>
                    ) : null}

                    {index === urls.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setUrls((items) => [...items, ""])}
                        className="text-slate-500 hover:text-sky-600"
                        aria-label="Add URL"
                      >
                        <PlusCircle />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </FormSection>

          <FormSection
            id="basic"
            title="Basic Ticket Information"
            icon={FileText}
            onEnter={setActive}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Ticket Title"
                error={errors.title}
                count={`${title.length}/200 characters`}
              >
                <input
                  name="title"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    if (errors.title) {
                      setErrors((current) => ({ ...current, title: undefined }));
                    }
                  }}
                  onBlur={() => setTouched((current) => ({ ...current, title: true }))}
                  maxLength={200}
                  className={titleFieldClass}
                  placeholder="Keep it short and clear"
                />
              </Field>

              <Field label="Ticket Type" required>
                <SearchDropdown
                  value={type}
                  onChange={(value) => setType(value as ClientTicketType)}
                  placeholder="Select request type."
                  searchPlaceholder="Search request type"
                  options={ticketTypeOptions}
                />
              </Field>
            </div>

            <Field
              label="Description"
              error={errors.description}
              count={`${plainLength(description)}/1000 characters`}
            >
              <RichTextEditor
                value={description}
                onChange={(value) => {
                  setDescription(value);
                  if (errors.description) {
                    setErrors((current) => ({ ...current, description: undefined }));
                  }
                }}
                onBlur={() =>
                  setTouched((current) => ({ ...current, description: true }))
                }
                validationState={
                  errors.description
                    ? "invalid"
                    : touched.description
                      ? "valid"
                      : undefined
                }
                placeholder="Describe the issue, expected outcome, and relevant context..."
              />
            </Field>
          </FormSection>

          <FormSection
            id="attachments"
            title="Attachments & References"
            icon={Paperclip}
            onEnter={setActive}
          >
            <div>
              <button
                type="button"
                onClick={() => setUploadMenu(true)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  queueFiles(Array.from(event.dataTransfer.files));
                }}
                disabled={uploading}
                className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-slate-200 px-6 py-9 hover:border-sky-400 hover:bg-sky-50 disabled:cursor-wait disabled:opacity-70"
              >
                <UploadCloud className="text-sky-500" />
                <strong className="mt-2 text-sm text-sky-600">
                  Click to upload{" "}
                  <span className="font-normal text-slate-500">
                    or drag and drop
                  </span>
                </strong>
                <small className="mt-1 text-slate-400">
                  SVG, PNG, JPG, PDF or TXT (max. 10 MB)
                </small>
              </button>

              <input
                ref={fileInput}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  queueFiles(Array.from(event.target.files ?? []));
                  event.target.value = "";
                }}
              />
            </div>

            <ul className="grid gap-2 sm:grid-cols-2">
              {pendingFiles.map((file) => (
                <li
                  key={`${file.name}-${file.size}-${file.lastModified}`}
                  className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm"
                >
                  <File size={16} className="text-sky-600" />
                  <span className="min-w-0 flex-1 truncate text-slate-700">
                    {file.name}
                  </span>
                  <span className="text-xs font-semibold text-sky-700">
                    Pending
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingFiles((items) =>
                        items.filter((item) => item !== file),
                      )
                    }
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}

              {initialTicket?.attachments.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm"
                >
                  <File size={16} />
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-slate-700 hover:text-sky-600"
                  >
                    {file.name}
                  </a>
                </li>
              ))}
            </ul>
          </FormSection>

          <FormSection
            id="priority"
            title="Priority & Timeline"
            icon={Clock3}
            onEnter={setActive}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Priority Level">
                <input
                  value="Not Assigned"
                  readOnly
                  className="field !bg-slate-50"
                />
              </Field>

              <Field label="Priority Number">
                <input
                  value="Managed by admin"
                  readOnly
                  className="field !bg-slate-50"
                />
              </Field>

              <Field label="Due Date">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="field"
                />
              </Field>

              <Field label="Estimated Time">
                <input
                  value="Managed by project team"
                  readOnly
                  className="field !bg-slate-50"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            id="assignment"
            title="Assignment"
            icon={UserRound}
            onEnter={setActive}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Assigned To">
                <input
                  value={initialTicket?.assignee || "Support team will assign"}
                  readOnly
                  className="field !bg-slate-50"
                />
              </Field>

              <Field label="Created By">
                <input
                  value={createdBy}
                  readOnly
                  className="field !bg-slate-50"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            id="notes"
            title="Internal Notes"
            icon={MessageSquare}
            onEnter={setActive}
          >
            <Field label="Notes">
              <div className="field !min-h-32 !bg-slate-50 leading-6 text-slate-500">
                Internal notes are restricted to the support and project-management team.
                Client users can add public comments after the ticket is created.
              </div>
            </Field>
          </FormSection>
        </main>
      </div>

      {uploadMenu ? (
        <div
          className="modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setUploadMenu(false)
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="resource-upload-source-title"
            className="ticket-modal !w-[620px]"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2
                  id="resource-upload-source-title"
                  className="text-2xl font-bold text-slate-800"
                >
                  Add attachments
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose where you want to add supporting files from.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setUploadMenu(false)}
                className="row-icon"
                aria-label="Close upload source chooser"
              >
                <X />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <UploadChoice
                icon={MonitorUp}
                title="Computer"
                detail="Browse local files"
                onClick={() => fileInput.current?.click()}
              />
              <UploadChoice
                icon={HardDrive}
                title="Drive"
                detail="Choose a drive file"
                onClick={() => fileInput.current?.click()}
              />
              <UploadChoice
                icon={Camera}
                title="Screenshot"
                detail="Capture your screen"
                onClick={() => void captureScreenshot()}
              />
            </div>

            <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              Files are queued while you fill out the form and uploaded after
              the ticket has been saved. You can remove them before saving.
            </p>
          </div>
        </div>
      ) : null}

      {confirmMode ? (
        <ConfirmDialog
          mode={confirmMode}
          dirty={isDirty}
          onCancel={() => setConfirmMode(undefined)}
          onConfirm={() => void perform(confirmMode)}
        />
      ) : null}

      {notice ? (
        <div
          role="status"
          className={cn(
            "ticket-toast",
            notice.toLowerCase().includes("correct") ||
              notice.toLowerCase().includes("cancelled") ||
              notice.toLowerCase().includes("unable") ||
              notice.toLowerCase().includes("skipped")
              ? "ticket-toast-error"
              : "ticket-toast-success",
          )}
        >
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
    </form>
  );
}

function FormSection({
  id,
  title,
  icon: Icon,
  onEnter,
  children,
}: {
  id: SectionId;
  title: string;
  icon: LucideIcon;
  onEnter: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`client-ticket-${id}`}
      onFocusCapture={() => onEnter(id)}
      className="scroll-mt-28 space-y-5"
    >
      <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-900">
        <Icon size={22} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  error,
  count,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">
        {label}
        {required ? (
          <span className="ml-1 text-[10px] leading-none text-red-500">*</span>
        ) : null}
      </span>
      {children}
      <span className="mt-1 flex justify-between text-xs">
        <span className="text-red-600">{error}</span>
        {count ? <span className="ml-auto text-slate-500">{count}</span> : null}
      </span>
    </label>
  );
}

function UploadChoice({
  icon: Icon,
  title,
  detail,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-slate-200 p-5 text-left hover:border-sky-400 hover:bg-sky-50"
    >
      <span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-600 group-hover:bg-white">
        <Icon size={21} />
      </span>
      <strong className="mt-4 block text-sm text-slate-800">{title}</strong>
      <small className="mt-1 block text-slate-500">{detail}</small>
    </button>
  );
}

function SearchDropdown({
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  validationState,
  options,
}: {
  value: string;
  onChange: (value: string, url?: string, id?: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  validationState?: "valid" | "invalid";
  options: Array<{
    label: string;
    detail?: string;
    color?: string;
    url?: string;
    id?: string;
  }>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.label === value);
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-invalid={validationState === "invalid" || undefined}
        className={cn(
          "field flex items-center justify-between text-left",
          validationState === "invalid" &&
            "!border-red-500 !ring-2 !ring-red-100",
          validationState === "valid" &&
            "!border-green-500 !ring-2 !ring-green-100",
        )}
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {selected?.color ? (
            <span className="inline-flex min-w-0 items-center gap-3">
              <TagChip label={selected.label} color={selected.color} />
              {selected.detail ? (
                <span className="truncate text-sm text-slate-500">
                  {selected.detail}
                </span>
              ) : null}
            </span>
          ) : (
            value || placeholder
          )}
        </span>

        <ChevronDown
          size={16}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
          <div className="flex gap-2">
            <input
              autoFocus
              className="field !min-h-9 !py-2"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>

          <div className="mt-2 max-h-52 overflow-y-auto">
            {filtered.map((option) => (
              <button
                type="button"
                key={`${option.id || ""}-${option.label}`}
                onClick={() => {
                  onChange(option.label, option.url, option.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 border-b border-slate-100 px-2 py-2.5 text-left text-sm last:border-0 hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {option.color ? (
                    <TagChip label={option.label} color={option.color} />
                  ) : (
                    <span className="font-medium text-slate-700">
                      {option.label}
                    </span>
                  )}
                  {option.detail ? (
                    <span className="truncate text-xs text-slate-500">
                      {option.detail}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}

            {!filtered.length ? (
              <p className="px-2 py-4 text-center text-sm text-slate-400">
                No matches found.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TagChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-28 shrink-0 items-center justify-center rounded-full px-3 py-1 text-center text-xs font-semibold ring-1 ring-inset",
        color,
      )}
    >
      {label}
    </span>
  );
}

function ConfirmDialog({
  mode,
  dirty,
  onCancel,
  onConfirm,
}: {
  mode: ConfirmMode;
  dirty: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const text =
    mode === "reset"
      ? dirty
        ? "Reset all entered ticket information?"
        : "The form is already empty. Reset it anyway?"
      : mode === "save"
        ? "Save this ticket as a draft?"
        : "Save and submit this ticket?";

  return (
    <div className="modal-backdrop">
      <div
        role="alertdialog"
        aria-modal="true"
        className="ticket-modal !w-[410px]"
      >
        <h2 className="text-2xl font-bold text-slate-700">Confirmation</h2>
        <p className="mt-5 font-semibold text-slate-700">{text}</p>
        <div className="mt-6 flex justify-between">
          <button
            type="button"
            className="button-secondary !border-cyan-500 !text-sky-600"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={
              mode === "reset"
                ? "rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700"
                : "button-primary !px-6"
            }
            onClick={onConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

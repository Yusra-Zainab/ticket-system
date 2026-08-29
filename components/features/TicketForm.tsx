"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import RichTextEditor from "@/components/ui/RichTextEditor";
import { cn } from "@/lib/utils";
import { findProjectModule, normalizeProjectModules } from "@/lib/projectModules";
import { useApp } from "@/components/providers/AppProvider";
import type { Project, Ticket, TicketAttachment, User } from "@/types";

const tagStyles = {
  red: "bg-red-50 text-red-700 ring-red-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  teal: "bg-teal-50 text-teal-700 ring-teal-200",
  pink: "bg-pink-50 text-pink-700 ring-pink-200",
  green: "bg-green-50 text-green-700 ring-green-200",
} as const;

const plainLength = (value: string) =>
  value.replace(/<[^>]*>/g, "").trim().length;
const createActivityEntry = (text: string) =>
  `${new Date().toLocaleString()} · ${text}`;
const schema = z.object({
  project: z.string().default(""),
  projectId: z.string().optional(),
  module: z.string().default(""),
  subModule: z.string().default(""),
  title: z.string().max(200).default(""),
  type: z.string().default(""),
  description: z
    .string()
    .refine((value) => plainLength(value) <= 1000, "Maximum 1000 characters"),
  priority: z.string().default(""),
  priorityNumber: z.preprocess(
    (value) => (value === "" || Number.isNaN(value) ? 1 : value),
    z.coerce.number().min(1).max(999),
  ),
  dueDate: z.string().default(""),
  estimatedTime: z.string().default(""),
  assignedTo: z.string().default(""),
  createdBy: z.string().default(""),
  notes: z
    .string()
    .refine((value) => plainLength(value) <= 1000, "Maximum 1000 characters"),
});
type FormValues = z.input<typeof schema>;
type Values = z.output<typeof schema>;
type ConfirmMode = "reset" | "save" | "submit";
const sections = [
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
const defaults: Values = {
  project: "",
  projectId: "",
  module: "",
  subModule: "",
  title: "",
  type: "",
  description: "",
  priority: "",
  priorityNumber: 1,
  dueDate: "",
  estimatedTime: "",
  assignedTo: "",
  createdBy: "",
  notes: "",
};

export default function TicketForm({
  initialSelection = {},
  initialTicket,
  projects = [],
  users = [],
  ticketBaseHref = "/tickets",
  ticketDraftsHref = "/tickets/drafts",
  projectBaseHref = "/projects",
  returnToHref = "/tickets/new",
}: {
  initialSelection?: {
    project?: string;
    projectId?: string;
    module?: string;
    subModule?: string;
    url?: string;
  };
  initialTicket?: Ticket;
  projects?: Project[];
  users?: User[];
  ticketBaseHref?: string;
  ticketDraftsHref?: string;
  projectBaseHref?: string;
  returnToHref?: string;
}) {
  const router = useRouter();
  const { saveDraft, submitTicket } = useApp();
  const [active, setActive] = useState("project");
  const savedForm = initialTicket?.formData as
    | (Partial<Values> & {
        urls?: string[];
        attachments?: TicketAttachment[];
        projectId?: string;
      })
    | undefined;
  const [urls, setUrls] = useState(
    savedForm?.urls?.length ? savedForm.urls : [initialSelection.url ?? ""],
  );
  const [attachments, setAttachments] = useState<TicketAttachment[]>(
    savedForm?.attachments?.length ? savedForm.attachments : [],
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(
    String(savedForm?.projectId ?? initialSelection.projectId ?? ""),
  );
  const [uploadMenu, setUploadMenu] = useState(false);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [customTimeOpen, setCustomTimeOpen] = useState(false);
  const [customDateTime, setCustomDateTime] = useState("");
  const [customStartedAt, setCustomStartedAt] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);

  function createTicketId() {
    return `TKT-${crypto.randomUUID().replaceAll("-", "").slice(0, 32)}`;
  }

  const {
    register,
    control,
    reset,
    getValues,
    setValue,
    formState: { errors, touchedFields, isDirty },
  } = useForm<FormValues, undefined, Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      ...defaults,
      ...savedForm,
      project: String(savedForm?.project ?? initialTicket?.project ?? initialSelection.project ?? ""),
      projectId: String(savedForm?.projectId ?? initialSelection.projectId ?? ""),
      module: String(savedForm?.module ?? initialTicket?.tags?.[0] ?? initialSelection.module ?? ""),
      subModule: String(savedForm?.subModule ?? initialTicket?.tags?.[1] ?? initialSelection.subModule ?? ""),
      title: initialTicket?.title === "Untitled ticket" ? "" : String(savedForm?.title ?? initialTicket?.title ?? ""),
      type: String(savedForm?.type ?? "Task"),
      description: String(savedForm?.description ?? initialTicket?.description ?? ""),
      priority: String(savedForm?.priority ?? "Not Assigned"),
      priorityNumber: Number(savedForm?.priorityNumber ?? initialTicket?.priority ?? 1),
      dueDate: String(savedForm?.dueDate ?? initialTicket?.dueDate ?? ""),
      assignedTo: String(savedForm?.assignedTo ?? initialTicket?.assignedTo ?? ""),
      createdBy: String(savedForm?.createdBy ?? initialTicket?.reporter ?? users[0]?.name ?? "System"),
    },
  });
  const selectedProject = useMemo(
    () =>
      projects.find((project) => project.id === selectedProjectId) ??
      projects.find((project) => project.name === getValues("project")),
    [getValues, projects, selectedProjectId],
  );
  const availableModules = useMemo(
    () => normalizeProjectModules(selectedProject),
    [selectedProject],
  );
  const availableSubModules = useMemo(() => {
    const activeModuleInfo = findProjectModule(availableModules, getValues("module") ?? "");
    return activeModuleInfo?.subModules ?? [];
  }, [availableModules, getValues]);
  const fieldClass = (name: keyof Values) =>
    cn(
      "field",
      errors[name] && "!border-red-500 !ring-red-100",
      touchedFields[name] &&
        !errors[name] &&
        "!border-green-500 !ring-green-100",
    );
  const jump = (id: string) => {
    setActive(id);
    document
      .getElementById(`ticket-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const uploadAttachments = (incoming: File[]) => {
    if (!incoming.length) return;
    setPendingFiles((current) => [...current, ...incoming]);
    setNotice("Files are ready and will be uploaded when the ticket is saved.");
    setUploadMenu(false);
  };

  const uploadPendingFiles = async (id: string) => {
    if (!pendingFiles.length) return;

    setUploading(true);
    try {
      const formData = new FormData();
      pendingFiles.forEach((file) => formData.append("files", file, file.name));
      const response = await fetch(`/api/tickets/${id}/attachments`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as {
        attachments?: TicketAttachment[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to upload attachments.");
      }
      setAttachments((current) => [...(data.attachments ?? []), ...current]);
      setPendingFiles([]);
    } finally {
      setUploading(false);
    }
  };
  const captureScreenshot = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      stream.getTracks().forEach((track) => track.stop());
      canvas.toBlob(
        (blob) =>
          blob &&
          uploadAttachments([
            new globalThis.File([blob], `screenshot-${Date.now()}.png`, {
              type: "image/png",
            }),
          ]),
        "image/png",
      );
    } catch {
      setNotice(
        "Screenshot capture was cancelled or is not supported by this browser.",
      );
      setUploadMenu(false);
    }
  };
  const perform = async (mode: ConfirmMode) => {
    setConfirmMode(undefined);
    if (mode === "reset") {
      reset(defaults);
      setUrls([""]);
      setAttachments([]);
      setPendingFiles([]);
      setSelectedProjectId("");
      setNotice("Form reset.");
      jump("project");
      return;
    }
    const values = getValues();
    try {
      setLoading(true);
      const ticketId = initialTicket?.id ?? createTicketId();
      const isDraft = mode === "save";
      const priority =
        ({ Critical: 1, High: 2, Medium: 3, Low: 4 } as const)[
          values.priority as "Critical" | "High" | "Medium" | "Low"
        ] ?? 4;
      const storedTicket: Ticket = {
        id: ticketId,
        title: values.title || "",
        project: values.project || "",
        status: isDraft ? "Open" : "Open",
        priority,
        assignedTo: values.assignedTo || "",
        reporter: values.createdBy || "",
        created: initialTicket?.created ?? "",
        updatedAt: new Date().toISOString(),
        dueDate: values.dueDate || "",
        description: values.description || "",
        tags: [values.module, values.subModule].filter((tag): tag is string => Boolean(tag)),
        formData: {
          id: ticketId,
          projectId: selectedProjectId,
          ...values,
          urls: urls.filter(Boolean),
          attachments,
          activity: [
            createActivityEntry(
              mode === "submit"
                ? initialTicket
                  ? "Ticket updated and submitted"
                  : "Ticket created and submitted"
                : initialTicket
                  ? "Ticket draft updated"
                  : "Ticket draft created",
            ),
            ...(
              Array.isArray(initialTicket?.formData?.activity)
                ? initialTicket.formData.activity.filter(
                    (item): item is string => typeof item === "string",
                  )
                : []
            ),
          ].slice(0, 50),
        },
      };
      if (mode === "submit") {
        await submitTicket(storedTicket);
        await uploadPendingFiles(ticketId);
        router.push(ticketBaseHref);
      } else {
        await saveDraft(storedTicket);
        await uploadPendingFiles(ticketId);
        router.push(ticketDraftsHref);
      }
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Unable to save the ticket.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const currentModule = getValues("module");
    const currentSubModule = getValues("subModule");

    if (currentModule && !findProjectModule(availableModules, currentModule)) {
      setValue("module", "", { shouldDirty: true, shouldValidate: true });
      setValue("subModule", "", { shouldDirty: true, shouldValidate: true });
      return;
    }

    if (currentSubModule) {
      const activeModule = findProjectModule(availableModules, currentModule ?? "");
      const validSubModule = activeModule?.subModules.some(
        (subModule) => subModule.name === currentSubModule,
      );

      if (!validSubModule) {
        setValue("subModule", "", { shouldDirty: true, shouldValidate: true });
      }
    }
  }, [availableModules, getValues, setValue]);

  const requestSubmit = (mode: "save" | "submit") => {
    setConfirmMode(mode);
  };

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
          <Link href={ticketDraftsHref} className="button-secondary">
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
            disabled={loading}
            onClick={() => setConfirmMode("save")}
            className="button-secondary"
          >
            <Save size={16} />
            Save Ticket
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => requestSubmit("submit")}
            className="button-primary"
          >
            <Send size={16} />
            Save and Submit Ticket
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
                      {section.detail && (
                        <small className="mt-0.5 block text-xs">
                          {section.detail}
                        </small>
                      )}
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
            <Controller
              name="project"
              control={control}
              render={({ field }) => (
                <Field label="Project Name" error={errors.project?.message}>
                  <SearchDropdown
                    value={field.value ?? ""}
                    onChange={(value, _url, id) => {
                      field.onChange(value);
                      setSelectedProjectId(id ?? "");
                    }}
                    placeholder="Select related project."
                    searchPlaceholder="Search Project"
                    options={projects.map((project) => ({
                      label: project.name,
                      id: project.id,
                    }))}
                    newLabel="New Project"
                    newHref={`${projectBaseHref}/new?returnTo=${encodeURIComponent(returnToHref)}`}
                  />
                </Field>
              )}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                name="module"
                control={control}
                render={({ field }) => (
                  <Field label="Module" error={errors.module?.message}>
                    <SearchDropdown
                      value={field.value ?? ""}
                      onChange={(value) => {
                        field.onChange(value);
                        setValue("subModule", "", {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      placeholder="Select or create a module"
                      searchPlaceholder="Search module."
                      options={availableModules.map((module) => ({
                        label: module.name,
                      }))}
                      newLabel="New Module"
                      onAction={() => {
                        router.push(
                          selectedProjectId
                            ? `${projectBaseHref}/${selectedProjectId}/edit?section=modules-setup&returnTo=${encodeURIComponent(returnToHref)}`
                            : `${projectBaseHref}/new?returnTo=${encodeURIComponent(returnToHref)}`,
                        );
                      }}
                    />
                  </Field>
                )}
              />
              <Controller
                name="subModule"
                control={control}
                render={({ field }) => (
                  <Field label="Sub Module" error={errors.subModule?.message}>
                    <SearchDropdown
                      value={field.value ?? ""}
                      onChange={(value) => {
                        field.onChange(value);
                      }}
                      placeholder={
                        getValues("module")
                          ? "Select or create a sub module"
                          : "Select a module first"
                      }
                      searchPlaceholder="Search sub module."
                      options={availableSubModules.map((subModule) => ({
                        label: subModule.name,
                      }))}
                      newLabel="New Sub Module"
                      onAction={() => {
                        router.push(
                          selectedProjectId
                            ? `${projectBaseHref}/${selectedProjectId}/edit?section=modules-setup&returnTo=${encodeURIComponent(returnToHref)}`
                            : `${projectBaseHref}/new?returnTo=${encodeURIComponent(returnToHref)}`,
                        );
                      }}
                    />
                  </Field>
                )}
              />
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
                      type="url"
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
                    {urls.length > 1 && (
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
                    )}
                    {index === urls.length - 1 && (
                      <button
                        type="button"
                        onClick={() => setUrls((items) => [...items, ""])}
                        className="text-slate-500 hover:text-sky-600"
                        aria-label="Add URL"
                      >
                        <PlusCircle />
                      </button>
                    )}
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
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Field
                    label="Ticket Title"
                    error={errors.title?.message}
                    count={`${(field.value ?? "").length}/200 characters`}
                  >
                    <input
                      {...field}
                      maxLength={200}
                      className={fieldClass("title")}
                      placeholder="Keep it short and clear"
                    />
                  </Field>
                )}
              />
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Field label="Ticket Type" error={errors.type?.message}>
                    <SearchDropdown
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Select request type."
                      searchPlaceholder="Search request type"
                      options={[
                        {
                          label: "Bug",
                          detail: "Something isn't working",
                          color: tagStyles.red,
                        },
                        {
                          label: "Feedback",
                          detail: "Suggestion or opinion",
                          color: tagStyles.orange,
                        },
                        {
                          label: "Technical Issue",
                          detail: "Technical problem",
                          color: tagStyles.amber,
                        },
                        {
                          label: "New Feature",
                          detail: "Request new functionality",
                          color: tagStyles.violet,
                        },
                        {
                          label: "Task",
                          detail: "General work request",
                          color: tagStyles.blue,
                        },
                        {
                          label: "Support Request",
                          detail: "Help or assistance needed",
                          color: tagStyles.teal,
                        },
                        {
                          label: "UI/UX Issue",
                          detail: "Design or usability problem",
                          color: tagStyles.pink,
                        },
                      ]}
                    />
                  </Field>
                )}
              />
            </div>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Field
                  label="Description"
                  error={errors.description?.message}
                  count={`${(field.value ?? "").replace(/<[^>]*>/g, "").length}/1000 characters`}
                >
                  <RichTextEditor
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    validationState={
                      errors.description
                        ? "invalid"
                        : touchedFields.description
                          ? "valid"
                          : undefined
                    }
                    placeholder="Describe the issue, expected outcome, and relevant context..."
                  />
                </Field>
              )}
            />
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
                  void uploadAttachments(Array.from(event.dataTransfer.files));
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
                  void uploadAttachments(Array.from(event.target.files ?? []));
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
                  <span className="text-xs font-semibold text-sky-700">Pending</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingFiles((items) => items.filter((item) => item !== file))
                    }
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
              {attachments.map((file) => (
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
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/attachments/${file.id}`, {
                        method: "DELETE",
                      });
                      setAttachments((items) =>
                        items.filter((item) => item.id !== file.id),
                      );
                    }}
                  >
                    <X size={15} />
                  </button>
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
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Field
                    label="Priority Level"
                    error={errors.priority?.message}
                  >
                    <SearchDropdown
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Select urgency."
                      searchPlaceholder="Search urgency"
                      options={[
                        {
                          label: "Critical",
                          detail: "Immediate action required",
                          color: tagStyles.red,
                        },
                        {
                          label: "High",
                          detail: "Needs quick attention",
                          color: tagStyles.orange,
                        },
                        {
                          label: "Medium",
                          detail: "Normal priority",
                          color: tagStyles.amber,
                        },
                        {
                          label: "Low",
                          detail: "Can be handled later",
                          color: tagStyles.green,
                        },
                      ]}
                    />
                  </Field>
                )}
              />
              <Field
                label="Priority Number"
                error={errors.priorityNumber?.message}
              >
                <input
                  type="number"
                  {...register("priorityNumber", { valueAsNumber: true })}
                  className={fieldClass("priorityNumber")}
                  placeholder="1 is highest priority."
                />
              </Field>
              <Field label="Due Date" error={errors.dueDate?.message}>
                <input
                  type="date"
                  {...register("dueDate")}
                  className={fieldClass("dueDate")}
                />
              </Field>
              <Controller
                name="estimatedTime"
                control={control}
                render={({ field }) => (
                  <Field
                    label="Estimated Time"
                    error={errors.estimatedTime?.message}
                  >
                    <SearchDropdown
                      value={field.value ?? ""}
                      onChange={(value) => {
                        if (value === "Custom") {
                          setCustomStartedAt(Date.now());
                          setCustomTimeOpen(true);
                        } else field.onChange(value);
                      }}
                      placeholder="Estimated work time."
                      searchPlaceholder="Search duration"
                      options={[
                        { label: "1 Hour" },
                        { label: "2 Hours" },
                        { label: "4 Hours" },
                        { label: "1 Day" },
                        { label: "3 Days" },
                        { label: "1 Week" },
                        { label: "Custom" },
                      ]}
                    />
                  </Field>
                )}
              />
            </div>
          </FormSection>
          <FormSection
            id="assignment"
            title="Assignment"
            icon={UserRound}
            onEnter={setActive}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Controller
                name="assignedTo"
                control={control}
                render={({ field }) => (
                  <Field label="Assigned To" error={errors.assignedTo?.message}>
                    <SearchDropdown
                      value={field.value ?? ""}
                      onChange={(value) => field.onChange(value)}
                      placeholder="Select responsible person."
                      searchPlaceholder="Search resources"
                      options={users.map((user) => ({
                        label: user.name,
                        detail: user.role,
                        id: user.id,
                      }))}
                    />
                  </Field>
                )}
              />
              <Field label="Created By">
                <input
                  {...register("createdBy")}
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
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Field
                  label="Notes"
                  error={errors.notes?.message}
                  count={`${(field.value ?? "").replace(/<[^>]*>/g, "").length}/1000 characters`}
                >
                  <RichTextEditor
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    validationState={
                      errors.notes
                        ? "invalid"
                        : touchedFields.notes
                          ? "valid"
                          : undefined
                    }
                    placeholder="Add private notes for the delivery team..."
                  />
                </Field>
              )}
            />
          </FormSection>
        </main>
      </div>
      {uploadMenu && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setUploadMenu(false)
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-source-title"
            className="ticket-modal !w-[620px]"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2
                  id="upload-source-title"
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
                onClick={captureScreenshot}
              />
            </div>
            <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              Files are queued while you fill out the form and uploaded after
              the ticket has been saved. You can remove them before saving.
            </p>
          </div>
        </div>
      )}
      {confirmMode && (
        <ConfirmDialog
          mode={confirmMode}
          dirty={
            isDirty ||
            attachments.length > 0 ||
            pendingFiles.length > 0 ||
            urls.some(Boolean)
          }
          onCancel={() => setConfirmMode(undefined)}
          onConfirm={() => perform(confirmMode)}
        />
      )}
      {customTimeOpen && (
        <div className="modal-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            className="ticket-modal !w-[460px]"
          >
            <h2 className="text-2xl font-bold text-slate-800">
              Custom estimated time
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Choose the expected completion date and time. The duration is
              calculated from now.
            </p>
            <label className="mt-5 block">
              <span className="label">Completion date and time</span>
              <input
                type="datetime-local"
                min={
                  customStartedAt
                    ? new Date(customStartedAt).toISOString().slice(0, 16)
                    : undefined
                }
                value={customDateTime}
                onChange={(event) => setCustomDateTime(event.target.value)}
                className="field"
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setCustomTimeOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !customDateTime ||
                  new Date(customDateTime).getTime() <= customStartedAt
                }
                className="button-primary disabled:opacity-50"
                onClick={() => {
                  const minutes = Math.ceil(
                    (new Date(customDateTime).getTime() - Date.now()) / 60000,
                  );
                  const days = Math.floor(minutes / 1440);
                  const hours = Math.floor((minutes % 1440) / 60);
                  const mins = minutes % 60;
                  setValue(
                    "estimatedTime",
                    [
                      days && `${days}d`,
                      hours && `${hours}h`,
                      mins && `${mins}m`,
                    ]
                      .filter(Boolean)
                      .join(" "),
                    { shouldValidate: true, shouldDirty: true },
                  );
                  setCustomTimeOpen(false);
                }}
              >
                Use calculated time
              </button>
            </div>
          </div>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className={cn(
            "ticket-toast",
            notice.toLowerCase().includes("correct") ||
              notice.toLowerCase().includes("cancelled") ||
              notice.toLowerCase().includes("unable")
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
      )}
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
  id: string;
  title: string;
  icon: typeof MapPin;
  onEnter: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`ticket-${id}`}
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
        {required && <span className="ml-1 text-[10px] leading-none text-red-500">*</span>}
      </span>
      {children}
      <span className="mt-1 flex justify-between text-xs">
        <span className="text-red-600">{error}</span>
        {count && <span className="ml-auto text-slate-500">{count}</span>}
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
  icon: typeof Camera;
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
  options,
  newLabel,
  newHref,
  onAction,
}: {
  value: string;
  onChange: (value: string, url?: string, id?: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  options: Array<{
    label: string;
    detail?: string;
    color?: string;
    url?: string;
    id?: string;
  }>;
  newLabel?: string;
  newHref?: string;
  onAction?: () => void;
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
        className="field flex items-center justify-between text-left"
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>
          {selected?.color ? (
            <span className="inline-flex min-w-0 items-center gap-3">
              <TagChip label={selected.label} color={selected.color} />
              {selected.detail && (
                <span className="truncate text-sm text-slate-500">
                  {selected.detail}
                </span>
              )}
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
      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
          <div className="flex gap-2 border-b border-slate-100 p-1 pb-3">
            <input
              autoFocus
              className="field !min-h-10 !rounded-lg !border-slate-200 !py-2.5"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
            />
            {newLabel && (newHref || onAction) ? (
              newHref ? (
                <Link
                  href={newHref}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-[#0284C7] px-3 py-2 text-center text-xs font-semibold text-[#0284C7] hover:bg-sky-50"
                >
                  {newLabel}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    onAction?.();
                  }}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-[#0284C7] px-3 py-2 text-center text-xs font-semibold text-[#0284C7] hover:bg-sky-50"
                >
                  {newLabel}
                </button>
              )
            ) : null}
          </div>
          <div className="mt-2 max-h-52 overflow-y-auto">
            {filtered.map((option) => (
              <button
                type="button"
                key={option.label}
                onClick={() => {
                  onChange(option.label, option.url, option.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 rounded-lg border-b border-slate-100 px-3 py-3 text-left text-sm last:border-0 hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {option.color ? (
                    <TagChip label={option.label} color={option.color} />
                  ) : (
                    <span className="font-medium text-slate-700">
                      {option.label}
                    </span>
                  )}
                  {option.detail && (
                    <span className="truncate text-xs text-slate-500">
                      {option.detail}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
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






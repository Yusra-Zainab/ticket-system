"use client";

import Link from "next/link";
import {
  CalendarDays,
  Camera,
  ChevronDown,
  CircleAlert,
  File,
  FileText,
  HardDrive,
  HelpCircle,
  Layers3,
  MessageSquare,
  MonitorUp,
  Paperclip,
  Plus,
  RotateCcw,
  Save,
  Send,
  UploadCloud,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import RichTextEditor from "@/components/ui/RichTextEditor";
import StickyToast from "@/components/ui/StickyToast";
import { cn } from "@/lib/utils";
import {
  projectPriorityDescriptions,
  projectStatusDescriptions,
} from "@/lib/statusOptions";

import ProjectStatus, {
  normalizeProjectStatus,
} from "@/components/features/ProjectStatus";
import { normalizeProjectModules } from "@/lib/projectModules";
import type {
  Client,
  Project,
  ProjectModuleDefinition,
  ProjectPriority,
  ProjectStatus as ProjectStatusType,
  TicketAttachment,
  User,
} from "@/types";

type ProjectFieldName =
  | "name"
  | "projectType"
  | "description"
  | "clientId"
  | "startDate"
  | "endDate"
  | "status"
  | "moduleName"
  | "subModule"
  | "stagingUrl"
  | "liveUrl"
  | "figmaUrl"
  | "githubUrl";

type FieldErrorMap = Partial<Record<ProjectFieldName, string>>;

type ModuleModalState =
  | { mode: "module" }
  | { mode: "subModule"; moduleName: string };

type ModuleDraft = {
  moduleName: string;
  subModuleName: string;
  moduleOwnerId: string;
};

type ProjectFormValues = {
  name: string;
  projectType: string;
  description: string;

  clientId: string;
  clientOwnerId: string;

  startDate: string;
  endDate: string;
  status: ProjectStatusType | "";
  priority: ProjectPriority;

  coordinatorId: string;
  teamIds: string[];
  department: string;

  moduleName: string;
  subModule: string;
  moduleOwnerId: string;
  modules: ProjectModuleDefinition[];

  stagingUrl: string;
  liveUrl: string;
  figmaUrl: string;
  githubUrl: string;

  internalNotes: string;
};

type SectionId =
  | "project-details"
  | "client-details"
  | "timeline-status"
  | "team-assignment"
  | "modules-setup"
  | "project-links"
  | "internal-notes";

type SearchOption = {
  value: string;
  label: string;
};

const projectStatuses: ProjectStatusType[] = [
  "Planning",
  "Not Started",
  "Active",
  "On Hold",
  "At Risk",
  "Delayed",
  "Completed",
  "Cancelled",
  "Archived",
];

const priorities: ProjectPriority[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
  "Not Assigned",
];

const priorityStyles: Record<ProjectPriority, string> = {
  Critical:
    "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 border border-red-200",
  High: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200 border border-orange-200",
  Medium:
    "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 border border-amber-200",
  Low: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 border border-emerald-200",
  "Not Assigned":
    "bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-200 border border-slate-200",
};

const projectTypes = [
  "Full Stack Development",
  "Payment Solutions",
  "Design & Branding",
  "Digital Strategy",
  "Artificial Intelligence",
];

const departments = [
  "Development",
  "Design",
  "Quality Assurance",
  "Product",
  "Support",
  "Operations",
];

const initialValues: ProjectFormValues = {
  name: "",
  projectType: "",
  description: "",

  clientId: "",
  clientOwnerId: "",

  startDate: "",
  endDate: "",
  status: "",
  priority: "Not Assigned",

  coordinatorId: "",
  teamIds: [],
  department: "",

  moduleName: "",
  subModule: "",
  moduleOwnerId: "",
  modules: [],

  stagingUrl: "",
  liveUrl: "",
  figmaUrl: "",
  githubUrl: "",

  internalNotes: "",
};

function valuesFromProject(project?: Project): ProjectFormValues {
  if (!project) return initialValues;

  const data = project.formData ?? {};
  const links =
    data.links && typeof data.links === "object"
      ? (data.links as Record<string, unknown>)
      : {};

  return {
    name: project.name ?? "",
    projectType:
      typeof data.projectType === "string" ? data.projectType : "",
    description: project.description ?? "",

    clientId: project.clientId ?? "",
    clientOwnerId:
      typeof data.clientOwnerId === "string" ? data.clientOwnerId : "",

    startDate: project.startDate ?? "",
    endDate: project.dueDate ?? "",
    status: normalizeProjectStatus(project.status),
    priority: project.priority ?? "Not Assigned",

    coordinatorId:
      typeof data.coordinatorId === "string" ? data.coordinatorId : "",
    teamIds: Array.isArray(data.teamIds)
      ? data.teamIds.filter((value): value is string => typeof value === "string")
      : project.teamMembers.map((member) => member.id),
    department:
      typeof data.department === "string" ? data.department : "",

    moduleName:
      typeof data.moduleName === "string" ? data.moduleName : "",
    subModule:
      typeof data.subModule === "string" ? data.subModule : "",
    moduleOwnerId:
      typeof data.moduleOwnerId === "string" ? data.moduleOwnerId : "",
    modules: normalizeProjectModules(project),

    stagingUrl: typeof links.staging === "string" ? links.staging : "",
    liveUrl: typeof links.live === "string" ? links.live : "",
    figmaUrl: typeof links.figma === "string" ? links.figma : "",
    githubUrl: typeof links.github === "string" ? links.github : "",

    internalNotes:
      typeof data.internalNotes === "string" ? data.internalNotes : "",
  };
}

const emptyFieldErrors: FieldErrorMap = {};

const emptyModuleDraft: ModuleDraft = {
  moduleName: "",
  subModuleName: "",
  moduleOwnerId: "",
};

const steps: Array<{
  id: SectionId;
  label: string;
  description?: string;
  icon: typeof FileText;
}> = [
  {
    id: "project-details",
    label: "Project Details",
    description: "Select project, module, and link.",
    icon: FileText,
  },
  {
    id: "client-details",
    label: "Client Details",
    icon: Users,
  },
  {
    id: "timeline-status",
    label: "Timeline & Status",
    icon: CalendarDays,
  },
  {
    id: "team-assignment",
    label: "Team Assignment",
    icon: UserCheck,
  },
  {
    id: "modules-setup",
    label: "Modules Setup",
    icon: Layers3,
  },
  {
    id: "project-links",
    label: "Project Links & Files",
    icon: Paperclip,
  },
  {
    id: "internal-notes",
    label: "Internal Notes",
    icon: MessageSquare,
  },
];

export default function NewProjectForm({
  users,
  clients,
  returnTo,
  initialProject,
}: {
  users: User[];
  clients: Client[];
  returnTo?: string;
  initialProject?: Project;
}) {
  const router = useRouter();

  const [values, setValues] = useState<ProjectFormValues>(() =>
    valuesFromProject(initialProject),
  );
  const [activeSection, setActiveSection] =
    useState<SectionId>("project-details");

  const [saving, setSaving] = useState(false);
  const [, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeKind, setNoticeKind] = useState<"success" | "error">("success");

  const showNotice = (
    message: string,
    kind: "success" | "error" = "success",
  ) => {
    setNoticeKind(kind);
    setNotice(message);
  };

  const [teamOpen, setTeamOpen] = useState(false);

  /*
   * Same attachment interaction model as TicketForm:
   * - click/drag-drop
   * - Computer / Drive / Screenshot modal
   * - immediate upload
   * - attachment list + delete
   *
   * This expects the project attachment API routes described below.
   */
  const [attachments, setAttachments] = useState<TicketAttachment[]>(
    () => initialProject?.formData?.attachments ?? [],
  );
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadMenu, setUploadMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === values.clientId),
    [clients, values.clientId],
  );
  const selectedModuleDefinition = useMemo(
    () =>
      values.modules.find((module) => module.name === values.moduleName) ?? null,
    [values.moduleName, values.modules],
  );
  const availableSubModules = selectedModuleDefinition?.subModules ?? [];
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<ProjectFieldName, boolean>>
  >({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>(emptyFieldErrors);
  const [moduleModal, setModuleModal] = useState<ModuleModalState | null>(null);
  const [moduleDraft, setModuleDraft] = useState<ModuleDraft>(emptyModuleDraft);

  const validateField = (
    field: ProjectFieldName,
    current: ProjectFormValues,
  ): string => {
    const plainDescription = current.description.replace(/<[^>]*>/g, "").trim();
    const validateUrl = (value: string, label: string) => {
      if (!value.trim()) return "";
      try {
        new URL(value);
        return "";
      } catch {
        return `${label} must be a valid URL.`;
      }
    };

    switch (field) {
      case "name":
      case "projectType":
      case "description":
      case "clientId":
      case "startDate":
      case "status":
      case "moduleName":
      case "subModule":
        return "";
      case "endDate":
        if (current.startDate && current.endDate && current.endDate < current.startDate) {
          return "End date cannot be before the start date.";
        }
        return "";
      case "stagingUrl":
        return validateUrl(current.stagingUrl, "Staging URL");
      case "liveUrl":
        return validateUrl(current.liveUrl, "Live URL");
      case "figmaUrl":
        return validateUrl(current.figmaUrl, "Figma URL");
      case "githubUrl":
        return validateUrl(current.githubUrl, "GitHub URL");
      default:
        return "";
    }
  };

  const validateValues = (current: ProjectFormValues): FieldErrorMap => {
    const fields: ProjectFieldName[] = [
      "name",
      "projectType",
      "description",
      "clientId",
      "startDate",
      "endDate",
      "status",
      "moduleName",
      "subModule",
      "stagingUrl",
      "liveUrl",
      "figmaUrl",
      "githubUrl",
    ];

    return fields.reduce<FieldErrorMap>((errors, field) => {
      const message = validateField(field, current);
      if (message) {
        errors[field] = message;
      }
      return errors;
    }, {});
  };

  useEffect(() => {
    setFieldErrors(validateValues(values));
  }, [values]);

  useEffect(() => {
    if (!values.moduleName) {
      if (values.subModule) {
        setValues((current) => ({ ...current, subModule: "" }));
      }
      return;
    }

    if (
      values.subModule &&
      !availableSubModules.some((subModule) => subModule.name === values.subModule)
    ) {
      setValues((current) => ({ ...current, subModule: "" }));
    }
  }, [availableSubModules, values.moduleName, values.subModule]);

  const touchField = (field: ProjectFieldName) => {
    setTouchedFields((current) => ({
      ...current,
      [field]: true,
    }));
  };

  const setField = <K extends keyof ProjectFormValues>(
    field: K,
    value: ProjectFormValues[K],
  ) => {
    setValues((current) => {
      if (field === "moduleName") {
        const nextModule = String(value ?? "");
        const nextDefinition = current.modules.find(
          (module) => module.name === nextModule,
        );

        return {
          ...current,
          moduleName: nextModule,
          subModule: nextDefinition?.subModules.some(
            (subModule) => subModule.name === current.subModule,
          )
            ? current.subModule
            : "",
        } as ProjectFormValues;
      }

      return {
        ...current,
        [field]: value,
      };
    });
  };

  const openModuleModal = (mode: ModuleModalState) => {
    const fallbackModuleName =
      mode.mode === "subModule" ? mode.moduleName : values.moduleName;

    setModuleDraft({
      moduleName: fallbackModuleName,
      subModuleName: mode.mode === "module" ? "" : values.subModule,
      moduleOwnerId: values.moduleOwnerId,
    });
    setModuleModal(mode);
  };

  const closeModuleModal = () => {
    setModuleModal(null);
    setModuleDraft(emptyModuleDraft);
  };

  const saveModuleDraft = () => {
    const moduleName = moduleDraft.moduleName.trim();
    const subModuleName = moduleDraft.subModuleName.trim();

    if (!moduleName) {
      showNotice("Enter a module name.", "error");
      return;
    }

    if (!subModuleName) {
      showNotice("Enter a sub module name.", "error");
      return;
    }

    const existingModule = values.modules.find(
      (module) => module.name.toLowerCase() === moduleName.toLowerCase(),
    );

    const nextModuleId =
      existingModule?.id ??
      `mod-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
    const existingSubModule = existingModule?.subModules.find(
      (subModule) => subModule.name.toLowerCase() === subModuleName.toLowerCase(),
    );
    const nextSubModuleId =
      existingSubModule?.id ??
      `sub-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;

    const nextModules = existingModule
      ? values.modules.map((module) =>
          module.id !== existingModule.id
            ? module
            : {
                ...module,
                name: moduleName,
                subModules: existingSubModule
                  ? module.subModules
                  : [
                      ...module.subModules,
                      { id: nextSubModuleId, name: subModuleName },
                    ],
              },
        )
      : [
          ...values.modules,
          {
            id: nextModuleId,
            name: moduleName,
            subModules: [{ id: nextSubModuleId, name: subModuleName }],
          },
        ];

    setValues((current) => ({
      ...current,
      modules: nextModules,
      moduleName,
      subModule: subModuleName,
      moduleOwnerId: moduleDraft.moduleOwnerId,
    }));
    setTouchedFields((current) => ({
      ...current,
      moduleName: true,
      subModule: true,
    }));
    showNotice(
      existingModule
        ? existingSubModule
          ? "Module selection updated."
          : "Sub module added successfully."
        : "Module and sub module added successfully.",
    );
    closeModuleModal();
  };
  const getFieldError = (field: ProjectFieldName) =>
    touchedFields[field] ? fieldErrors[field] : undefined;

  const getFieldState = (field: ProjectFieldName) => {
    const error = getFieldError(field);
    if (error) return "invalid" as const;
    if (touchedFields[field]) return "valid" as const;
    return undefined;
  };

  const inputClassName = (field: ProjectFieldName) =>
    cn(
      "new-project-input placeholder:text-[#98A2B3]",
      getFieldState(field) === "invalid" &&
        "!border-[#F04438] pr-11 ring-[3px] ring-[#F04438]/10",
      getFieldState(field) === "valid" &&
        "!border-[#12B76A] ring-[3px] ring-[#12B76A]/10",
    );

  const jump = (id: SectionId) => {
    setActiveSection(id);

    document.getElementById(`project-form-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const resetForm = () => {
    setValues(valuesFromProject(initialProject));
    setAttachments(initialProject?.formData?.attachments ?? []);
    setPendingFiles([]);
    setTeamOpen(false);
    setUploadMenu(false);
    setTouchedFields({});
    setFieldErrors(emptyFieldErrors);
    closeModuleModal();
    setError("");
    showNotice("Project form reset.");
    setActiveSection("project-details");
    jump("project-details");
  };

  const queueAttachments = (incoming: File[]) => {
    const accepted = incoming.filter((file) => file.size <= 10 * 1024 * 1024);

    if (accepted.length !== incoming.length) {
      showNotice("Files larger than 10 MB were skipped.", "error");
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

    setUploadMenu(false);
  };

  const uploadPendingFiles = async (projectId: string) => {
    if (!pendingFiles.length) return [] as TicketAttachment[];

    setUploading(true);

    try {
      const formData = new FormData();

      pendingFiles.forEach((file) => {
        formData.append("files", file, file.name);
      });

      const response = await fetch(`/api/projects/${projectId}/attachments`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));

        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "Unable to upload project attachments.",
        );
      }

      const data = (await response.json()) as {
        attachments?: TicketAttachment[];
      };

      const uploaded = data.attachments ?? [];
      setAttachments((current) => [...current, ...uploaded]);
      setPendingFiles([]);
      return uploaded;
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
        (blob) => {
          if (!blob) return;

          queueAttachments([
            new globalThis.File(
              [blob],
              `project-screenshot-${Date.now()}.png`,
              {
                type: "image/png",
              },
            ),
          ]);
        },
        "image/png",
      );
    } catch {
      showNotice(
        "Screenshot capture was cancelled or is not supported by this browser.",
        "error",
      );
      setUploadMenu(false);
    }
  };

  const removeAttachment = async (attachment: TicketAttachment) => {
    try {
      const response = await fetch(
        `/api/project-attachments/${attachment.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Unable to delete attachment.");
      }

      setAttachments((items) =>
        items.filter((item) => item.id !== attachment.id),
      );
    } catch (cause) {
      showNotice(
        cause instanceof Error
          ? cause.message
          : "Unable to delete attachment.",
        "error",
      );
    }
  };

  const buildPayload = () => {
    const client = clients.find((item) => item.id === values.clientId);

    return {
      name: values.name,
      description: values.description,

      clientId: values.clientId ? Number(values.clientId) : null,
      client: client?.company || client?.name || "",

      projectType: values.projectType,

      status: values.status || "Not Started",
      priority: values.priority,

      progress: 0,

      startDate: values.startDate || null,
      dueDate: values.endDate || null,

      clientOwnerId: values.clientOwnerId || null,

      coordinatorId: values.coordinatorId || null,
      department: values.department,

      teamIds: values.teamIds,
      team: values.teamIds
        .map((id) => users.find((user) => user.id === id)?.name)
        .filter((value): value is string => Boolean(value)),

      moduleName: values.moduleName,
      subModule: values.subModule,
      moduleOwnerId: values.moduleOwnerId || null,
      modules: values.modules,

      links: {
        staging: values.stagingUrl,
        live: values.liveUrl,
        figma: values.figmaUrl,
        github: values.githubUrl,
      },

      attachments,

      internalNotes: values.internalNotes,
    };
  };

  const saveProject = async (mode: "draft" | "open" | "save") => {
    const targetLifecycle =
      mode === "draft"
        ? "DRAFT"
        : mode === "open"
          ? "OPEN"
          : (initialProject?.lifecycle ?? "DRAFT");

    setError("");
    setSaving(true);

    try {
      const payload = buildPayload();

      const response = initialProject
        ? await fetch(`/api/projects/${initialProject.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...payload,
              lifecycle: targetLifecycle,
            }),
          })
        : await fetch("/api/projects", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              project: payload,
              state: targetLifecycle === "DRAFT" ? "draft" : "open",
            }),
          });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "Unable to save project.",
        );
      }

      const projectId = String(result.id ?? initialProject?.id ?? "");

      if (!projectId) {
        throw new Error("The project was saved without an id.");
      }

      await uploadPendingFiles(projectId);

      router.refresh();

      if (initialProject && returnTo !== "ticket") {
        if (targetLifecycle === "DRAFT") {
          showNotice("Project draft saved successfully.");
          return;
        }

        if (initialProject.lifecycle === "DRAFT") {
          router.push(returnTo || "/projects/" + projectId + "?saved=1");
          return;
        }

        showNotice("Project changes saved successfully.");
        return;
      }

      if (targetLifecycle === "DRAFT") {
        router.push("/projects/drafts?saved=1");
        return;
      }

      if (returnTo === "ticket") {
        router.push(
          `/tickets/new?project=${encodeURIComponent(result.name ?? values.name)}&projectId=${encodeURIComponent(projectId)}`,
        );
      } else {
        router.push(returnTo || `/projects/${projectId}?saved=1`);
      }
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Unable to save project.";
      setError(message);
      showNotice(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const secondaryActionLabel =
    initialProject?.lifecycle === "OPEN" ? "Save Changes" : "Save Draft";
  const secondaryActionMode: "draft" | "save" =
    initialProject?.lifecycle === "OPEN" ? "save" : "draft";
  const primaryActionLabel = saving
    ? "Saving..."
    : initialProject?.lifecycle === "OPEN"
      ? "Update Project"
      : initialProject?.lifecycle === "DRAFT"
        ? "Submit Project"
        : "Create Project";

  return (
    <div className="min-h-screen bg-white pb-32 text-[#344054]">
      <header className="sticky top-0 z-20 border-b border-transparent bg-white/95 px-5 pb-4 pt-5 backdrop-blur md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h1
            className="text-[30px] font-bold leading-[38px] text-[#101828]"
            style={{
              fontFamily: "Satoshi, Arial, sans-serif",
            }}
          >
            {initialProject ? "Edit Project" : "New Project"}
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/projects/drafts"
              className="new-project-secondary-button inline-flex items-center gap-2"
            >
              Drafts
            </Link>

            <button
              type="button"
              disabled={saving || uploading}
              onClick={resetForm}
              className="new-project-secondary-button inline-flex items-center gap-2"
            >
              <RotateCcw size={16} />
              <span>Reset</span>
            </button>

            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => void saveProject(secondaryActionMode)}
              className="new-project-secondary-button inline-flex items-center gap-2"
            >
              <Save size={16} />
              <span>{secondaryActionLabel}</span>
            </button>

            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => void saveProject("open")}
              className="new-project-register-button inline-flex items-center gap-2"
            >
              <Send size={18} />
              {primaryActionLabel}
            </button>
          </div>
        </div>

      </header>

      <div className="mx-auto mt-4 grid max-w-[1376px] gap-8 px-5 md:px-8 lg:grid-cols-[264px_minmax(0,1080px)]">
        <aside className="hidden self-start lg:sticky lg:top-[132px] lg:block">
          <div>
            {steps.map((step, index) => {
              const Icon = step.icon;
              const selected = activeSection === step.id;

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => jump(step.id)}
                  className="group flex h-[68px] w-full items-start gap-3 text-left"
                >
                  <div className="flex h-full w-12 shrink-0 flex-col items-center">
                    <span
                      className={cn(
                        "grid size-12 shrink-0 place-items-center rounded-[10px] border shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition",
                        selected
                          ? "border-transparent bg-[#E6F8FB] text-[#0284C7]"
                          : "border-[#EAECF0] bg-white text-[#344054]",
                      )}
                    >
                      <Icon size={23} />
                    </span>

                    {index !== steps.length - 1 && (
                      <span
                        className={cn(
                          "mt-1 h-3 w-[2px] rounded-full transition",
                          selected
                            ? "bg-gradient-to-b from-[#0284C7] via-[#06B6D4] to-[#22D3EE]"
                            : "bg-[#EAECF0]",
                        )}
                      />
                    )}
                  </div>

                  <span className="pt-1">
                    <span
                      className={cn(
                        "block text-sm font-semibold leading-5 transition",
                        selected
                          ? "text-[#0284C7]"
                          : "text-[#344054] opacity-60",
                      )}
                    >
                      {step.label}
                    </span>

                    {step.description && (
                      <span
                        className={cn(
                          "block whitespace-nowrap text-sm leading-5",
                          selected
                            ? "text-[#0284C7]"
                            : "text-[#667085] opacity-60",
                        )}
                      >
                        {step.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 space-y-8">
          <FormSection
            id="project-details"
            icon={FileText}
            title="Project Details"
            onEnter={setActiveSection}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Project Name" error={getFieldError("name")}>
                <input
                  value={values.name}
                  onFocus={() => setActiveSection("project-details")}
                  onBlur={() => touchField("name")}
                  onChange={(event) => setField("name", event.target.value)}
                  placeholder="Enter project name"
                  className={inputClassName("name")}
                />
              </Field>

              <Field label="Project Type" error={getFieldError("projectType")}>
                <SearchDropdown
                  value={values.projectType}
                  onChange={(value) => setField("projectType", value)}
                  onBlur={() => touchField("projectType")}
                  placeholder="Select project type"
                  searchPlaceholder="Search project type."
                  options={projectTypes.map((type) => ({
                    value: type,
                    label: type,
                  }))}
                  state={getFieldState("projectType")}
                />
              </Field>
            </div>

            <Field label="Description" error={getFieldError("description")}>
              <div
                className={cn(
                  "new-project-editor",
                  getFieldState("description") === "invalid" && "rounded-[8px] ring-[3px] ring-[#F04438]/10",
                  getFieldState("description") === "valid" && "rounded-[8px] ring-[3px] ring-[#12B76A]/10",
                )}
              >
                <RichTextEditor
                  value={values.description}
                  onChange={(value) => setField("description", value)}
                  onBlur={() => touchField("description")}
                  validationState={getFieldState("description")}
                  placeholder="Enter project description"
                />
              </div>

              <CharacterCount value={values.description} max={1000} />
            </Field>
          </FormSection>

          <FormSection
            id="client-details"
            icon={Users}
            title="Client Details"
            trailing={<HelpCircle size={20} />}
            onEnter={setActiveSection}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Client Name" error={getFieldError("clientId")}>
                <SearchDropdown
                  value={values.clientId}
                  onChange={(value) => setField("clientId", value)}
                  onBlur={() => touchField("clientId")}
                  placeholder="Select client"
                  searchPlaceholder="Search client."
                  options={clients.map((client) => ({
                    value: client.id,
                    label: client.company || client.name,
                  }))}
                  state={getFieldState("clientId")}
                />
              </Field>

              <Field label="Client Owner">
                <SearchDropdown
                  value={values.clientOwnerId}
                  onChange={(value) => setField("clientOwnerId", value)}
                  placeholder="Select client owner"
                  searchPlaceholder="Search client owner."
                  options={users.map((user) => ({
                    value: user.id,
                    label: user.name,
                  }))}
                />
              </Field>

              <Field label="Client Email">
                <input
                  readOnly
                  value={selectedClient?.email || ""}
                  placeholder="Auto-filled"
                  className="new-project-input bg-[#F9FAFB] placeholder:text-[#98A2B3]"
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            id="timeline-status"
            icon={CalendarDays}
            title="Timeline & Status"
            onEnter={setActiveSection}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Start Date" error={getFieldError("startDate")}>
                <DateField
                  value={values.startDate}
                  onChange={(value) => setField("startDate", value)}
                  onBlur={() => touchField("startDate")}
                  placeholder="Select start date"
                  state={getFieldState("startDate")}
                />
              </Field>

              <Field label="End Date" error={getFieldError("endDate")}>
                <DateField
                  value={values.endDate}
                  onChange={(value) => setField("endDate", value)}
                  onBlur={() => touchField("endDate")}
                  placeholder="Select end date"
                  state={getFieldState("endDate")}
                />
              </Field>

              <Field label="Project Status" error={getFieldError("status")}>
                <StatusDropdown
                  value={values.status}
                  onChange={(value) => setField("status", value)}
                  onBlur={() => touchField("status")}
                  state={getFieldState("status")}
                />
              </Field>

              <Field label="Project Priority">
                <PriorityDropdown
                  value={values.priority}
                  onChange={(value) => setField("priority", value)}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            id="team-assignment"
            icon={UserCheck}
            title="Team Assignment"
            onEnter={setActiveSection}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Project Coordinator">
                <SearchDropdown
                  value={values.coordinatorId}
                  onChange={(value) => setField("coordinatorId", value)}
                  placeholder="Select coordinator"
                  searchPlaceholder="Search coordinator."
                  options={users.map((user) => ({
                    value: user.id,
                    label: user.name,
                  }))}
                />
              </Field>

              <Field label="Assigned Team">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setTeamOpen((current) => !current)}
                    className="new-project-input flex items-center justify-between text-left"
                  >
                    <span
                      className={cn(
                        values.teamIds.length
                          ? "text-[#101828]"
                          : "text-[#98A2B3]",
                      )}
                    >
                      {values.teamIds.length
                        ? `${values.teamIds.length} team member${
                            values.teamIds.length === 1 ? "" : "s"
                          } selected`
                        : "Select team members"}
                    </span>

                    <ChevronDown size={18} className="text-[#98A2B3]" />
                  </button>

                  {teamOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Close team selector"
                        className="fixed inset-0 z-30 cursor-default"
                        onClick={() => setTeamOpen(false)}
                      />

                      <div className="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[#D0D5DD] bg-white p-2 shadow-[0_8px_24px_rgba(16,24,40,0.12)]">
                        {users.map((user) => {
                          const checked = values.teamIds.includes(user.id);

                          return (
                            <label
                              key={user.id}
                              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-[#F9FAFB]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setField(
                                    "teamIds",
                                    checked
                                      ? values.teamIds.filter(
                                          (id) => id !== user.id,
                                        )
                                      : [...values.teamIds, user.id],
                                  );
                                }}
                                className="size-4 accent-[#0284C7]"
                              />

                              <span className="text-sm font-medium text-[#344054]">
                                {user.name}
                              </span>

                              <span className="ml-auto text-xs text-[#98A2B3]">
                                {user.role}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </Field>

              <Field label="Department">
                <SearchDropdown
                  value={values.department}
                  onChange={(value) => setField("department", value)}
                  placeholder="Select department"
                  searchPlaceholder="Search department."
                  options={departments.map((department) => ({
                    value: department,
                    label: department,
                  }))}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            id="modules-setup"
            icon={Layers3}
            title="Modules Setup"
            onEnter={setActiveSection}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Module Name" error={getFieldError("moduleName")}>
                <SearchDropdown
                  value={values.moduleName}
                  onChange={(value) => {
                    setField("moduleName", value);
                    touchField("moduleName");
                  }}
                  onBlur={() => touchField("moduleName")}
                  placeholder="Select or create a module"
                  searchPlaceholder="Search module."
                  options={values.modules.map((module) => ({
                    value: module.name,
                    label: module.name,
                  }))}
                  state={getFieldState("moduleName")}
                  actionLabel="New Module"
                  onAction={() => openModuleModal({ mode: "module" })}
                />
              </Field>

              <Field label="Sub Module" error={getFieldError("subModule")}>
                <SearchDropdown
                  value={values.subModule}
                  onChange={(value) => {
                    setField("subModule", value);
                    touchField("subModule");
                  }}
                  onBlur={() => touchField("subModule")}
                  placeholder={
                    values.moduleName
                      ? "Select or create a sub module"
                      : "Select a module first"
                  }
                  searchPlaceholder="Search sub module."
                  options={availableSubModules.map((subModule) => ({
                    value: subModule.name,
                    label: subModule.name,
                  }))}
                  state={getFieldState("subModule")}
                  actionLabel="New Sub Module"
                  onAction={() =>
                    openModuleModal({
                      mode: "subModule",
                      moduleName: values.moduleName,
                    })
                  }
                  disabled={!values.moduleName && values.modules.length === 0}
                />
              </Field>

              <Field label="Module Owner">
                <SearchDropdown
                  value={values.moduleOwnerId}
                  onChange={(value) => setField("moduleOwnerId", value)}
                  placeholder="Select owner"
                  searchPlaceholder="Search module owner."
                  options={users.map((user) => ({
                    value: user.id,
                    label: user.name,
                  }))}
                />
              </Field>
            </div>

          </FormSection>

          <FormSection
            id="project-links"
            icon={Paperclip}
            title="Project Links & Files"
            onEnter={setActiveSection}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Staging URL" error={getFieldError("stagingUrl")}>
                <input
                  type="url"
                  value={values.stagingUrl}
                  onBlur={() => touchField("stagingUrl")}
                  onChange={(event) =>
                    setField("stagingUrl", event.target.value)
                  }
                  placeholder="Paste staging URL"
                  className={inputClassName("stagingUrl")}
                />
              </Field>

              <Field label="Live URL" error={getFieldError("liveUrl")}>
                <input
                  type="url"
                  value={values.liveUrl}
                  onBlur={() => touchField("liveUrl")}
                  onChange={(event) => setField("liveUrl", event.target.value)}
                  placeholder="Paste live URL"
                  className={inputClassName("liveUrl")}
                />
              </Field>

              <Field label="Figma URL" error={getFieldError("figmaUrl")}>
                <input
                  type="url"
                  value={values.figmaUrl}
                  onBlur={() => touchField("figmaUrl")}
                  onChange={(event) => setField("figmaUrl", event.target.value)}
                  placeholder="Paste Figma link"
                  className={inputClassName("figmaUrl")}
                />
              </Field>

              <Field label="GitHub URL" error={getFieldError("githubUrl")}>
                <input
                  type="url"
                  value={values.githubUrl}
                  onBlur={() => touchField("githubUrl")}
                  onChange={(event) =>
                    setField("githubUrl", event.target.value)
                  }
                  placeholder="Paste repository link"
                  className={inputClassName("githubUrl")}
                />
              </Field>
            </div>

            <Field label="Upload Files">
              <button
                type="button"
                disabled={uploading}
                onClick={() => setUploadMenu(true)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  queueAttachments(Array.from(event.dataTransfer.files));
                }}
                className="flex w-full max-w-[672px] flex-col items-center rounded-xl border border-[#EAECF0] bg-white px-6 py-5 transition hover:border-[#0284C7] hover:bg-[#F8FDFF] disabled:cursor-wait disabled:opacity-60"
              >
                <span className="grid size-10 place-items-center rounded-lg border border-[#EAECF0] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
                  <UploadCloud size={20} className="text-[#475467]" />
                </span>

                <strong className="mt-3 text-sm font-semibold text-[#0284C7]">
                  Click to upload{" "}
                  <span className="font-normal text-[#475467]">
                    or drag and drop
                  </span>
                </strong>

                <small className="mt-1 text-xs text-[#475467]">
                  SVG, PNG, JPG, PDF or TXT (max. 10 MB)
                </small>
              </button>

              <input
                ref={fileInput}
                type="file"
                multiple
                className="hidden"
                accept=".svg,.png,.jpg,.jpeg,.gif,.pdf,.txt"
                onChange={(event) => {
                  queueAttachments(Array.from(event.target.files ?? []));

                  event.target.value = "";
                }}
              />

              {pendingFiles.length > 0 && (
                <ul className="mt-3 grid max-w-[672px] gap-2 sm:grid-cols-2">
                  {pendingFiles.map((file) => (
                    <li
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex min-w-0 items-center gap-2 rounded-lg border border-[#B2DDFF] bg-[#EFF8FF] p-3 text-sm"
                    >
                      <File size={16} className="shrink-0 text-[#175CD3]" />

                      <span className="min-w-0 flex-1 truncate text-[#344054]">
                        {file.name}
                      </span>

                      <span className="shrink-0 text-[11px] font-medium text-[#175CD3]">
                        Pending
                      </span>

                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() =>
                          setPendingFiles((items) =>
                            items.filter((item) => item !== file),
                          )
                        }
                        className="grid size-7 shrink-0 place-items-center rounded-md text-[#667085] hover:bg-white hover:text-[#D92D20]"
                      >
                        <X size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {attachments.length > 0 && (
                <ul className="mt-3 grid max-w-[672px] gap-2 sm:grid-cols-2">
                  {attachments.map((attachment) => (
                    <li
                      key={attachment.id}
                      className="flex min-w-0 items-center gap-2 rounded-lg border border-[#EAECF0] bg-[#F9FAFB] p-3 text-sm"
                    >
                      <File size={16} className="shrink-0 text-[#667085]" />

                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 truncate text-[#344054] hover:text-[#0284C7]"
                      >
                        {attachment.name}
                      </a>

                      <button
                        type="button"
                        aria-label={`Remove ${attachment.name}`}
                        onClick={() => void removeAttachment(attachment)}
                        className="grid size-7 shrink-0 place-items-center rounded-md text-[#667085] hover:bg-white hover:text-[#D92D20]"
                      >
                        <X size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Field>
          </FormSection>

          <FormSection
            id="internal-notes"
            icon={MessageSquare}
            title="Internal Notes"
            onEnter={setActiveSection}
          >
            <Field label="Description">
              <div className="new-project-editor">
                <RichTextEditor
                  value={values.internalNotes}
                  onChange={(value) => setField("internalNotes", value)}
                  placeholder="Add internal project notes"
                />
              </div>

              <CharacterCount value={values.internalNotes} max={1000} />
            </Field>
          </FormSection>
        </main>
      </div>

      {uploadMenu && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setUploadMenu(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-upload-source-title"
            className="ticket-modal !w-[620px]"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2
                  id="project-upload-source-title"
                  className="text-2xl font-bold text-slate-800"
                >
                  Add attachments
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Choose where you want to add project files from.
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
                onClick={() => void captureScreenshot()}
              />
            </div>

            <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              Files are uploaded immediately after selection and can be
              removed before the project is saved.
            </p>
          </div>
        </div>
      )}

      {moduleModal && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModuleModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-module-modal-title"
            className="relative w-full max-w-[524px] rounded-[8px] border border-[#EAECF0] bg-white p-4 shadow-[0_24px_48px_rgba(16,24,40,0.16)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="project-module-modal-title"
                  className="text-[20px] font-semibold leading-[30px] text-[#344054]"
                  style={{ fontFamily: "Geist, sans-serif" }}
                >
                  {moduleModal.mode === "module" ? "Add New Module" : "Add New Sub Module"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModuleModal}
                className="grid size-8 place-items-center rounded-md text-[#667085] hover:bg-[#F9FAFB]"
                aria-label="Close module popup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <Field label="Module Name">
                <input
                  value={moduleDraft.moduleName}
                  onChange={(event) =>
                    setModuleDraft((current) => ({
                      ...current,
                      moduleName: event.target.value,
                    }))
                  }
                  placeholder="Enter module name"
                  className="new-project-input placeholder:text-[#98A2B3]"
                />
              </Field>

              <Field label="Sub Module">
                <input
                  value={moduleDraft.subModuleName}
                  onChange={(event) =>
                    setModuleDraft((current) => ({
                      ...current,
                      subModuleName: event.target.value,
                    }))
                  }
                  placeholder="Enter sub module"
                  className="new-project-input placeholder:text-[#98A2B3]"
                />
              </Field>

              <Field label="Module Owner">
                <SearchDropdown
                  value={moduleDraft.moduleOwnerId}
                  onChange={(value) =>
                    setModuleDraft((current) => ({
                      ...current,
                      moduleOwnerId: value,
                    }))
                  }
                  placeholder="Select owner"
                  searchPlaceholder="Search module owner."
                  options={users.map((user) => ({
                    value: user.id,
                    label: user.name,
                  }))}
                />
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModuleModal}
                className="inline-flex h-10 items-center justify-center rounded-[8px] border border-[#06B6D4] bg-white px-[14px] text-sm font-semibold text-[#0284C7] shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveModuleDraft}
                className="inline-flex h-10 items-center justify-center rounded-[8px] bg-[linear-gradient(66.43deg,#0284C7_12.82%,#06B6D4_47.68%,#22D3EE_82.54%)] px-[14px] text-sm font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <StickyToast
          message={notice}
          kind={noticeKind}
          onDismiss={() => setNotice("")}
        />
      )}
    </div>
  );
}

function FormSection({
  id,
  icon: Icon,
  title,
  trailing,
  onEnter,
  children,
}: {
  id: SectionId;
  icon: typeof FileText;
  title: string;
  trailing?: React.ReactNode;
  onEnter: (id: SectionId) => void;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`project-form-${id}`}
      onFocusCapture={() => onEnter(id)}
      onPointerDownCapture={() => onEnter(id)}
      className="scroll-mt-37.5 space-y-4"
    >
      <div className="flex items-center gap-3">
        <Icon size={24} strokeWidth={2} className="text-[#101828]" />

        <div className="flex items-center gap-1">
          <h2
            className="text-[24px] font-bold leading-8 text-[#101828]"
            style={{
              fontFamily: "Satoshi, Arial, sans-serif",
            }}
          >
            {title}
          </h2>

          {trailing}
        </div>
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required = false,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[14px] font-medium leading-5 text-[#344054]">
        {label}

        {required && <span className="ml-1 text-[#D92D20]">*</span>}
      </span>

      <div className="relative">
        {children}
        {error ? (
          <span
            title={error}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-[#F04438]"
          >
            <CircleAlert size={16} />
          </span>
        ) : null}
      </div>

      {hint && !error ? (
        <span className="mt-1 block text-[14px] leading-5 text-[#475467]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function SearchDropdown({
  value,
  onChange,
  onBlur,
  placeholder,
  searchPlaceholder,
  options,
  state,
  actionLabel,
  onAction,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  searchPlaceholder: string;
  options: SearchOption[];
  state?: "invalid" | "valid";
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((option) => option.value === value);

  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const close = () => {
    setOpen(false);
    setQuery("");
    onBlur?.();
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => !disabled && setOpen((current) => !current)}
        className={cn(
          "new-project-input flex items-center justify-between gap-3 pr-11 text-left",
          open && "!border-[#98A2B3]",
          state === "invalid" && "!border-[#F04438] ring-[3px] ring-[#F04438]/10",
          state === "valid" && "!border-[#12B76A] ring-[3px] ring-[#12B76A]/10",
          disabled && "cursor-not-allowed bg-[#F9FAFB] text-[#98A2B3]",
        )}
      >
        <span
          className={cn(
            "min-w-0 truncate",
            selected ? "text-[#344054]" : "text-[#98A2B3]",
          )}
        >
          {selected?.label || placeholder}
        </span>

        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 text-[#98A2B3] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close dropdown"
            className="fixed inset-0 z-30 cursor-default"
            onClick={close}
          />

          <div className="absolute left-0 top-[43px] z-40 w-full overflow-hidden rounded-b-[8px] border border-[#D0D5DD] bg-white p-3 shadow-[0_4px_12px_rgba(16,24,40,0.08)]">
            <div className="flex gap-2">
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-[50px] w-full rounded-[8px] border border-[#D0D5DD] bg-white px-4 text-[16px] text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none placeholder:text-[#98A2B3] focus:border-[#0284C7]"
              />

              {actionLabel && onAction ? (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onAction();
                  }}
                  className="inline-flex h-[50px] shrink-0 items-center justify-center gap-1 rounded-[8px] border border-[#06B6D4] bg-white px-3 text-sm font-semibold text-[#0284C7] shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:bg-[#F0F9FF]"
                >
                  <Plus size={14} />
                  {actionLabel}
                </button>
              ) : null}
            </div>

            <div className="mt-2 max-h-[270px] overflow-y-auto">
              {filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => {
                    onChange(option.value);
                    close();
                  }}
                  className="flex min-h-[50px] w-full items-center border-b border-[#EAECF0] px-4 text-left text-[16px] text-[#667085] transition last:border-b-0 hover:bg-[#F9FAFB] hover:text-[#344054]"
                >
                  {option.label}
                </button>
              ))}

              {!filtered.length && (
                <div className="px-4 py-5 text-sm text-[#98A2B3]">
                  No results found.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusDropdown({
  value,
  onChange,
  onBlur,
  state,
}: {
  value: ProjectStatusType | "";
  onChange: (value: ProjectStatusType) => void;
  onBlur?: () => void;
  state?: "invalid" | "valid";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = projectStatuses.filter((status) =>
    status.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const close = () => {
    setOpen(false);
    setQuery("");
    onBlur?.();
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "new-project-input flex items-center justify-between gap-3 pr-11 text-left",
          open && "!border-[#98A2B3]",
          state === "invalid" && "!border-[#F04438] ring-[3px] ring-[#F04438]/10",
          state === "valid" && "!border-[#12B76A] ring-[3px] ring-[#12B76A]/10",
        )}
      >
        <span className="min-w-0">
          {value ? (
            <ProjectStatus
              status={value}
              size="sm"
              className="!min-w-[122px]"
            />
          ) : (
            <span className="text-[#98A2B3]">Select status</span>
          )}
        </span>

        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 text-[#98A2B3] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close status dropdown"
            className="fixed inset-0 z-30 cursor-default"
            onClick={close}
          />

          <div className="absolute left-0 top-[43px] z-40 w-full overflow-hidden rounded-b-[8px] border border-[#D0D5DD] bg-white p-3 shadow-[0_4px_12px_rgba(16,24,40,0.08)]">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search status."
              className="h-[50px] w-full rounded-[8px] border border-[#D0D5DD] bg-white px-4 text-[16px] text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none placeholder:text-[#98A2B3] focus:border-[#0284C7]"
            />

            <div className="mt-2 max-h-[440px] overflow-y-auto">
              {filtered.map((status) => (
                <button
                  key={status}
                  type="button"
                  role="option"
                  aria-selected={value === status}
                  onClick={() => {
                    onChange(status);
                    close();
                  }}
                  className={cn(
                    "flex min-h-[60px] w-full items-center justify-between gap-3 border-b border-[#EAECF0] px-4 py-2 text-left transition last:border-b-0 hover:bg-[#F9FAFB]",
                    value === status && "bg-[#F9FAFB]",
                  )}
                >
                  <span className="inline-flex min-w-0 items-center gap-3">
                    <ProjectStatus
                      status={status}
                      size="sm"
                      className="!min-w-[122px]"
                    />
                    <span className="truncate text-[13px] leading-5 text-[#667085]">
                      {projectStatusDescriptions[status]}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PriorityDropdown({
  value,
  onChange,
}: {
  value: ProjectPriority;
  onChange: (value: ProjectPriority) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = priorities.filter((priority) =>
    priority.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "new-project-input flex items-center justify-between gap-3 text-left",
          open && "!border-[#98A2B3]",
        )}
      >
        <span
          className={cn(
            "inline-flex min-w-[122px] items-center justify-center rounded-full px-3 py-1 text-xs font-semibold",
            priorityStyles[value],
          )}
        >
          {value}
        </span>

        <ChevronDown
          size={18}
          className={cn(
            "shrink-0 text-[#98A2B3] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close priority dropdown"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => {
              setOpen(false);
              setQuery("");
            }}
          />

          <div className="absolute left-0 top-[43px] z-40 w-full overflow-hidden rounded-b-[8px] border border-[#D0D5DD] bg-white p-3 shadow-[0_4px_12px_rgba(16,24,40,0.08)]">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search priority."
              className="h-[50px] w-full rounded-[8px] border border-[#D0D5DD] bg-white px-4 text-[16px] text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none placeholder:text-[#98A2B3] focus:border-[#0284C7]"
            />

            <div className="mt-2 max-h-[280px] overflow-y-auto">
              {filtered.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  role="option"
                  aria-selected={value === priority}
                  onClick={() => {
                    onChange(priority);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex min-h-[60px] w-full items-center border-b border-[#EAECF0] px-4 py-2 text-left transition last:border-b-0 hover:bg-[#F9FAFB]",
                    value === priority && "bg-[#F9FAFB]",
                  )}
                >
                  <span className="inline-flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex min-w-[122px] items-center justify-center rounded-full px-3 py-1 text-xs font-semibold",
                        priorityStyles[priority],
                      )}
                    >
                      {priority}
                    </span>
                    <span className="truncate text-[13px] leading-5 text-[#667085]">
                      {projectPriorityDescriptions[priority]}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DateField({
  value,
  onChange,
  onBlur,
  placeholder,
  state,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  state?: "invalid" | "valid";
}) {
  return (
    <div className="relative">
      <input
        type="date"
        value={value}
        aria-label={placeholder}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "new-project-input pr-11",
          !value && "text-[#98A2B3]",
          state === "invalid" && "!border-[#F04438] ring-[3px] ring-[#F04438]/10",
          state === "valid" && "!border-[#12B76A] ring-[3px] ring-[#12B76A]/10",
        )}
      />

      <CalendarDays
        size={18}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#344054]"
      />
    </div>
  );
}

function CharacterCount({
  value,
  max,
}: {
  value: string;
  max: number;
}) {
  const plain = value.replace(/<[^>]*>/g, "");

  return (
    <p
      className={cn(
        "mt-1 text-sm",
        plain.length > max ? "text-[#D92D20]" : "text-[#475467]",
      )}
    >
      {plain.length} / {max} characters
    </p>
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

      <strong className="mt-4 block text-sm text-slate-800">
        {title}
      </strong>

      <small className="mt-1 block text-slate-500">{detail}</small>
    </button>
  );
}
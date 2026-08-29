"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  ArrowRight,
  ChevronDown,
  Clock3,
  Edit3,
  ExternalLink,
  File,
  FileImage,
  FilePenLine,
  FileText,
  Filter,
  FolderOpen,
  Grip,
  GripHorizontal,
  History,
  Search,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

import { cn, formatDate } from "@/lib/utils";

import {
  ticketPriorityDescriptions,
  ticketTypeDescriptions,
} from "@/lib/statusOptions";

import type {
  TicketListPortal,
  TicketListRow,
  TicketPriorityType,
} from "@/types/ticketList";

/* =========================================================
   STATUS
   ========================================================= */

const statuses = [
  "Open",
  "Reviewed",
  "Assigned",
  "In Progress",
  "Active",
  "Blocked",
  "Awaiting",
  "Ready for Review",
  "QA",
  "Validation",
  "Resolved",
  "Closed",
  "Reopened",
  "Cancelled",
] as const;

type TicketStatus = (typeof statuses)[number];

const statusColors: Record<TicketStatus, string> = {
  Open: "bg-violet-600 text-white ring-1 ring-violet-700",

  Reviewed: "bg-slate-700 text-white ring-1 ring-slate-800",

  Assigned: "bg-blue-600 text-white ring-1 ring-blue-700",

  "In Progress": "bg-cyan-600 text-white ring-1 ring-cyan-700",

  Active: "bg-teal-600 text-white ring-1 ring-teal-700",

  Blocked: "bg-orange-600 text-white ring-1 ring-orange-700",

  Awaiting: "bg-pink-600 text-white ring-1 ring-pink-700",

  "Ready for Review": "bg-violet-600 text-white ring-1 ring-violet-700",

  QA: "bg-green-600 text-white ring-1 ring-green-700",

  Validation: "bg-blue-600 text-white ring-1 ring-blue-700",

  Resolved: "bg-green-600 text-white ring-1 ring-green-700",

  Closed: "bg-gray-700 text-white ring-1 ring-gray-800",

  Reopened: "bg-red-600 text-white ring-1 ring-red-700",

  Cancelled: "bg-gray-400 text-white ring-1 ring-gray-500",
};

const statusDescriptions: Record<TicketStatus, string> = {
  Open: "Newly created and ready to be picked up",

  Reviewed: "Checked and waiting for the next action",

  Assigned: "Ownership is set and work is about to begin",

  "In Progress": "Actively being worked on",

  Active: "Work is actively moving forward",

  Blocked: "Waiting on a dependency or decision",

  Awaiting: "Waiting for a reply, input, or approval",

  "Ready for Review": "Completed and waiting for review",

  QA: "Under testing and quality checks",

  Validation: "Being verified before completion",

  Resolved: "A fix or response is in place",

  Closed: "Finished and no longer active",

  Reopened: "Opened again after a previous resolution",

  Cancelled: "Intentionally stopped and no longer pursued",
};

/* =========================================================
   TYPES
   ========================================================= */

const ticketTypes = [
  "Bug",
  "Task",
  "Change Request",
  "New Feature",
  "Feedback",
  "Support Request",
  "UI/UX Issue",
  "Content Update",
  "Technical Issue",
  "Testing / QA",
  "Maintenance",
  "Urgent Fix",
  "System Down",
] as const;

type TicketType = (typeof ticketTypes)[number];

const ticketTypeColors: Record<TicketType, string> = {
  Bug: "bg-red-600 text-white ring-red-700",

  Task: "bg-blue-600 text-white ring-blue-700",

  "Change Request": "bg-violet-600 text-white ring-violet-700",

  "New Feature": "bg-purple-600 text-white ring-purple-700",

  Feedback: "bg-orange-500 text-white ring-orange-600",

  "Support Request": "bg-teal-600 text-white ring-teal-700",

  "UI/UX Issue": "bg-pink-600 text-white ring-pink-700",

  "Content Update": "bg-emerald-600 text-white ring-emerald-700",

  "Technical Issue": "bg-amber-600 text-white ring-amber-700",

  "Testing / QA": "bg-cyan-600 text-white ring-cyan-700",

  Maintenance: "bg-slate-500 text-white ring-slate-600",

  "Urgent Fix": "bg-red-700 text-white ring-red-800",

  "System Down": "bg-indigo-700 text-white ring-indigo-800",
};

/* =========================================================
   PRIORITY TYPE
   ========================================================= */

const priorityTypes: TicketPriorityType[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
  "Not Assigned",
];

const priorityTypeColors: Record<TicketPriorityType, string> = {
  Critical: "bg-red-600 text-white ring-1 ring-red-700",

  High: "bg-orange-600 text-white ring-1 ring-orange-700",

  Medium: "bg-yellow-600 text-white ring-1 ring-yellow-700",

  Low: "bg-green-600 text-white ring-1 ring-green-700",

  "Not Assigned": "bg-gray-400 text-white ring-1 ring-gray-500",
};

/* =========================================================
   INTERNAL TYPES
   ========================================================= */

type SortKey =
  | "title"
  | "priorityType"
  | "project"
  | "createdBy"
  | "assignedTo"
  | "createdAt"
  | "dueDate"
  | "status";

type SortState = {
  key: SortKey;

  direction: "asc" | "desc";
};

type SafeTicketRow = TicketListRow & {
  history: string[];
};

type TicketPatch = {
  id: string;

  status?: string;

  priorityType?: TicketPriorityType;

  priorityNumber?: number;
};

type PriorityGroup = {
  key: string;

  priorityNumber: number;

  startIndex: number;

  count: number;
};

type ResizePreview = {
  key: string;

  count: number;
};

type FileCategory = "Photos and videos" | "Files" | "Links";

type TicketFile = {
  id: string;

  category: FileCategory;

  name: string;

  detail: string;

  date: string;

  url: string;
};

type FilesModalState = {
  ticketId: string;

  title: string;

  loading: boolean;

  files: TicketFile[];

  error?: string;
};

type ToastState = {
  kind: "success" | "error" | "rename";

  text: string;
};

const fileCategories: FileCategory[] = ["Photos and videos", "Files", "Links"];

const fileCategoryLabel: Record<FileCategory, string> = {
  "Photos and videos": "Photos and videos",

  Files: "Files",

  Links: "Links",
};

/* =========================================================
   NORMALIZATION
   ========================================================= */

function normalizeRow(ticket: TicketListRow): SafeTicketRow {
  const rawHistory = (
    ticket as TicketListRow & {
      history?: unknown;
    }
  ).history;

  return {
    ...ticket,

    history: Array.isArray(rawHistory)
      ? rawHistory.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
      : [],
  };
}

function normalizeRows(tickets: TicketListRow[]) {
  return tickets.map(normalizeRow);
}

function normalizeTicketStatus(value: string): TicketStatus {
  return statuses.includes(value as TicketStatus)
    ? (value as TicketStatus)
    : "Open";
}

function normalizeTicketType(value: string): TicketType {
  return ticketTypes.includes(value as TicketType)
    ? (value as TicketType)
    : "Task";
}

/* =========================================================
   PORTAL ROUTES
   ========================================================= */

function ticketApiHref(
  portal: TicketListPortal,

  id: string,
) {
  const encoded = encodeURIComponent(id);

  if (portal === "client") {
    return `/api/client-portal/tickets/${encoded}`;
  }

  return `/api/tickets/${encoded}`;
}

function editTicketHref(
  portal: TicketListPortal,

  id: string,

  detailBaseHref: string,
  draftBaseHref?: string,
) {
  const encoded = encodeURIComponent(id);

  if (portal === "admin") {
    return `/tickets/new?draft=${encoded}`;
  }

  if (portal === "client") {
    return `/client-portal/tickets/new?draft=${encoded}`;
  }

  if (draftBaseHref) {
    return `${draftBaseHref}?draft=${encoded}`;
  }

  /*
   * Resource new-ticket page edits only drafts.
   * Existing OPEN tickets are edited from Details.
   */
  return `${detailBaseHref}/${encoded}`;
}

/* =========================================================
   FILE HELPERS
   ========================================================= */

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : [];
}

function formatFileSize(size: number) {
  if (!size) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];

  const index = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1,
  );

  const value = size / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function filesFromPayload(payload: unknown): TicketFile[] {
  const root = recordValue(payload);

  const formData = recordValue(root.formData);

  const attachmentsRaw = Array.isArray(root.attachments)
    ? root.attachments
    : Array.isArray(formData.attachments)
      ? formData.attachments
      : [];

  const attachments = attachmentsRaw.flatMap((raw, index): TicketFile[] => {
    const item = recordValue(raw);

    const url = typeof item.url === "string" ? item.url : "";

    const name =
      typeof item.name === "string" ? item.name : `File ${index + 1}`;

    if (!url) {
      return [];
    }

    const mimeType = typeof item.mimeType === "string" ? item.mimeType : "";

    const size = Number(item.size ?? 0);

    const uploadedAt =
      typeof item.uploadedAt === "string" ? item.uploadedAt : "";

    const media =
      mimeType.startsWith("image/") || mimeType.startsWith("video/");

    return [
      {
        id: String(item.id ?? `attachment-${index}`),

        category: media ? "Photos and videos" : "Files",

        name,

        detail: media
          ? (mimeType.split("/")[0] || "Media").replace(/^./, (character) =>
              character.toUpperCase(),
            )
          : formatFileSize(size),

        date: uploadedAt ? formatDate(uploadedAt) : "",

        url,
      },
    ];
  });

  /*
   * Portal DTOs expose links directly.
   * Admin Ticket stores them in formData.urls.
   */
  const links = stringArray(root.links).length
    ? stringArray(root.links)
    : stringArray(formData.urls);

  const linkFiles = links.map(
    (url, index): TicketFile => ({
      id: `link-${index}-${url}`,

      category: "Links",

      name: url.replace(/^https?:\/\//, ""),

      detail: "External link",

      date: "",

      url,
    }),
  );

  return [...attachments, ...linkFiles];
}

/* =========================================================
   PRIORITY GROUPING
   ========================================================= */

function createPriorityGroups(tickets: SafeTicketRow[]): PriorityGroup[] {
  const groups: PriorityGroup[] = [];

  tickets.forEach((ticket, index) => {
    const previous = groups[groups.length - 1];

    if (previous && previous.priorityNumber === ticket.priorityNumber) {
      previous.count += 1;

      return;
    }

    groups.push({
      key: `${ticket.priorityNumber}-${index}`,

      priorityNumber: ticket.priorityNumber,

      startIndex: index,

      count: 1,
    });
  });

  return groups;
}

/* =========================================================
   SORT BUTTON
   ========================================================= */

function SortButton({
  label,
  sortKey,
  sort,
  onSort,
  centered = false,
}: {
  label: string;

  sortKey: SortKey;

  sort: SortState | undefined;

  onSort: (key: SortKey) => void;

  centered?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        "inline-flex items-center gap-1",

        centered && "justify-center",
      )}
      aria-label={`Sort by ${label}`}
    >
      {label}

      <ChevronDown
        size={13}
        className={cn(
          "transition-transform",

          sort?.key === sortKey && sort.direction === "asc" && "rotate-180",

          sort?.key !== sortKey && "opacity-40",
        )}
      />
    </button>
  );
}

/* =========================================================
   TAG FILTER

   This is the ORIGINAL colored tag + description style.
   ========================================================= */

function TagDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;

  value: string;

  options: Array<{
    value: string;

    label: string;

    color: string;

    description: string;
  }>;

  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value);

  return (
    <div className="relative">
      <span className="label">{label}</span>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="field flex items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0 flex-1">
          {selected ? (
            <span className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "inline-flex w-28 shrink-0 items-center justify-center rounded-full px-3 py-1 text-center text-xs font-semibold ring-1 ring-inset",

                  selected.color,
                )}
              >
                {selected.label}
              </span>

              <span className="truncate text-sm text-slate-500">
                {selected.description}
              </span>
            </span>
          ) : (
            <span className="text-slate-400">All</span>
          )}
        </span>

        <ChevronDown size={16} className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 grid max-h-72 w-full gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <button
            type="button"
            onClick={() => {
              onChange("All");

              setOpen(false);
            }}
            className="rounded-lg px-3 py-2 text-left hover:bg-slate-50"
          >
            <span className="block text-xs font-semibold text-slate-600">
              All
            </span>

            <span className="mt-0.5 block text-xs text-slate-400">
              Show every option
            </span>
          </button>

          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => {
                onChange(option.value);

                setOpen(false);
              }}
              className="rounded-lg px-3 py-2 text-left hover:bg-slate-50"
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex w-28 shrink-0 items-center justify-center rounded-full px-3 py-1.5 text-center text-xs font-semibold ring-1 ring-inset",

                    option.color,
                  )}
                >
                  {option.label}
                </span>

                <span className="text-sm text-slate-500">
                  {option.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PERSON
   ========================================================= */

function PersonCell({ name }: { name: string }) {
  if (!name.trim()) {
    return <span className="text-sm text-gray-400">Not set</span>;
  }

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <span className="flex items-center gap-2">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#0284C7]/10 text-[9px] font-semibold text-[#0284C7]">
        {initials}
      </span>

      <span className="truncate text-sm text-gray-900">{name}</span>
    </span>
  );
}

/* =========================================================
   FILE ROW
   ========================================================= */

function TicketFileRow({ file }: { file: TicketFile }) {
  const icon =
    file.category === "Links" ? (
      <ExternalLink className="text-cyan-600" />
    ) : file.name.toLowerCase().endsWith(".pdf") ? (
      <FileText className="text-red-500" />
    ) : (
      <File className="text-blue-600" />
    );

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 hover:border-sky-300 hover:bg-sky-50"
    >
      <span className="grid size-11 shrink-0 place-items-center">{icon}</span>

      <span className="min-w-0 flex-1">
        <span className="mb-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
          {file.category}
        </span>

        <strong className="block truncate text-base font-medium text-slate-700">
          {file.name}
        </strong>

        <span className="block truncate text-sm text-slate-500">
          {file.detail}
        </span>
      </span>

      <time className="w-28 shrink-0 text-right text-sm leading-5 text-slate-500">
        {file.date}
      </time>
    </a>
  );
}

/* =========================================================
   FILES MODAL
   ========================================================= */

function TicketFilesModal({
  state,
  onClose,
}: {
  state: FilesModalState;

  onClose: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  const [category, setCategory] = useState<FileCategory | undefined>();

  const [query, setQuery] = useState("");

  const visibleCategories = category ? [category] : fileCategories;

  const matches = (file: TicketFile) =>
    !query.trim() ||
    `${file.name} ${file.detail} ${file.url}`
      .toLowerCase()
      .includes(query.toLowerCase());

  const reset = () => {
    setCategory(undefined);

    setQuery("");

    setSearchOpen(false);
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-files-title"
        className="ticket-modal !max-h-[90vh] !w-[1035px] overflow-y-auto !p-0"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2
              id="ticket-files-title"
              className="text-2xl font-bold text-slate-700"
            >
              Files
            </h2>

            <p className="mt-0.5 max-w-2xl truncate text-xs text-slate-400">
              {state.title}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="row-icon hover:!bg-transparent hover:text-[#0284C7]"
            aria-label="Close files"
          >
            <X />
          </button>
        </div>

        <div className="p-5">
          <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
            <label className="flex h-14 items-center">
              <input
                value={query}
                onFocus={() => setSearchOpen(true)}
                onClick={() => setSearchOpen(true)}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 px-4 text-lg text-slate-700 outline-none placeholder:text-slate-500"
                placeholder="Search in files"
              />

              <span className="grid h-full w-16 place-items-center border-l border-slate-300 text-slate-600">
                <Search size={27} />
              </span>
            </label>

            {searchOpen && !category && (
              <div className="flex flex-wrap gap-3 border-t border-slate-200 px-4 py-3">
                {fileCategories.map((item) => (
                  <button
                    type="button"
                    key={item}
                    onClick={() => setCategory(item)}
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-[#0284C7] hover:text-white"
                  >
                    {fileCategoryLabel[item]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {category && (
            <div className="mt-3 flex justify-start">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-500 hover:text-cyan-600"
              >
                <ArrowRight className="rotate-180" size={18} />
                Back
              </button>
            </div>
          )}

          {state.loading ? (
            <p className="py-12 text-center text-sm text-slate-500">
              Loading files...
            </p>
          ) : state.error ? (
            <p className="py-12 text-center text-sm text-red-600">
              {state.error}
            </p>
          ) : (
            <div className="mt-3 space-y-5">
              {state.files.length ? (
                visibleCategories.map((item) => {
                  const sectionFiles = state.files.filter(
                    (file) => file.category === item && matches(file),
                  );

                  return (
                    <section key={item}>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-700">
                          {item}
                        </h3>

                        {!category && (
                          <button
                            type="button"
                            onClick={() => setCategory(item)}
                            className="inline-flex items-center gap-2 text-base font-semibold text-cyan-500 hover:text-cyan-600"
                          >
                            See All
                            <ArrowRight size={20} />
                          </button>
                        )}
                      </div>

                      {sectionFiles.length ? (
                        item === "Photos and videos" ? (
                          <div className="flex flex-wrap gap-3">
                            {sectionFiles
                              .slice(0, category ? undefined : 5)
                              .map((file) => (
                                <a
                                  key={file.id}
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={file.name}
                                  className="group block w-32"
                                >
                                  <span className="grid h-20 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 group-hover:border-sky-400">
                                    <FileImage className="text-sky-500" />
                                  </span>

                                  <span className="mt-2 inline-flex rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">
                                    {file.category}
                                  </span>

                                  <span className="mt-1 block truncate text-xs text-slate-500 group-hover:text-sky-600">
                                    {file.name}
                                  </span>
                                </a>
                              ))}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {sectionFiles
                              .slice(0, category ? undefined : 2)
                              .map((file) => (
                                <TicketFileRow key={file.id} file={file} />
                              ))}
                          </div>
                        )
                      ) : (
                        <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                          No matching {item.toLowerCase()}.
                        </p>
                      )}
                    </section>
                  );
                })
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                  No attachments have been uploaded for this ticket yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN TABLE
   ========================================================= */

export default function TicketsTable({
  initialTickets,
  currentUserId,
  portal,
  detailBaseHref,
  draftsBaseHref,
}: {
  initialTickets: TicketListRow[];

  currentUserId: string;

  portal: TicketListPortal;

  detailBaseHref: string;

  draftsBaseHref?: string;
}) {
  const [tickets, setTickets] = useState<SafeTicketRow[]>(() =>
    normalizeRows(initialTickets),
  );

  const [query, setQuery] = useState("");

  const [status, setStatus] = useState<"All" | TicketStatus>("All");

  const [type, setType] = useState<"All" | TicketType>("All");

  const [priority, setPriority] = useState<"All" | TicketPriorityType>("All");

  const [selected, setSelected] = useState<string[]>([]);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [bulkDialog, setBulkDialog] = useState<
    "status" | "priority" | undefined
  >();

  const [renameId, setRenameId] = useState<string | undefined>();

  const [renameValue, setRenameValue] = useState("");

  const [renameConfirmationOpen, setRenameConfirmationOpen] = useState(false);

  const [historyId, setHistoryId] = useState<string | undefined>();

  const [deleteId, setDeleteId] = useState<string | undefined>();

  const [filesModal, setFilesModal] = useState<FilesModalState | undefined>();

  const [sort, setSort] = useState<SortState | undefined>();

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(10);

  const [resizePreview, setResizePreview] = useState<
    ResizePreview | undefined
  >();

  const [busy, setBusy] = useState(false);

  const [toast, setToast] = useState<ToastState | undefined>();


  /* =======================================================
     FILTER + SORT
     ======================================================= */

  const filtered = useMemo(
    () =>
      tickets
        .filter((ticket) => {
          const matchesSearch =
            `${ticket.title} ${ticket.project} ${ticket.assignedTo} ${ticket.createdBy} ${ticket.type}`
              .toLowerCase()
              .includes(query.trim().toLowerCase());

          const ticketStatus = normalizeTicketStatus(ticket.status);

          const ticketType = normalizeTicketType(ticket.type);

          return (
            matchesSearch &&
            (status === "All" || ticketStatus === status) &&
            (type === "All" || ticketType === type) &&
            (priority === "All" || ticket.priorityType === priority)
          );
        })
        .sort((left, right) => {
          if (!sort) {
            return left.priorityNumber - right.priorityNumber;
          }

          const leftValue = String(left[sort.key] ?? "");

          const rightValue = String(right[sort.key] ?? "");

          return (
            leftValue.localeCompare(rightValue, undefined, {
              numeric: true,
            }) * (sort.direction === "asc" ? 1 : -1)
          );
        }),
    [tickets, query, status, type, priority, sort],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  const currentPage = Math.min(page, pageCount);

  const start = (currentPage - 1) * pageSize;

  const visible = filtered.slice(start, start + pageSize);

  const visibleIds = visible.map((ticket) => ticket.id);

  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  const priorityGroups = useMemo(
    () => createPriorityGroups(visible),
    [visible],
  );

  /* =======================================================
     NOTIFY
     ======================================================= */

  function notify(
    kind: ToastState["kind"],

    text: string,
  ) {
    setToast({
      kind,
      text,
    });

    if (kind !== "error") {
      window.setTimeout(
        () => setToast(undefined),
        kind === "rename" ? 2000 : 3000,
      );
    }
  }

  /* =======================================================
     PATCH
     ======================================================= */

  async function patchTickets(updates: TicketPatch[]) {
    const response = await fetch(`/api/ticket-list/${portal}`, {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        updates,
      }),
    });

    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(result.error || "Unable to update ticket.");
    }
  }

  /* =======================================================
     SORT
     ======================================================= */

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,

      direction:
        current?.key === key && current.direction === "asc" ? "desc" : "asc",
    }));

    setPage(1);
  }

  /* =======================================================
     BULK UPDATE
     ======================================================= */

  async function applySelectedStatus(nextStatus: TicketStatus) {
    if (!selected.length) {
      return;
    }

    const previous = tickets;

    try {
      setBusy(true);

      setTickets((rows) =>
        rows.map((row) =>
          selected.includes(row.id)
            ? {
                ...row,

                status: nextStatus,
              }
            : row,
        ),
      );

      await patchTickets(
        selected.map((id) => ({
          id,

          status: nextStatus,
        })),
      );

      setSelected([]);

      setBulkDialog(undefined);

      notify("success", `Status changed to ${nextStatus}`);
    } catch (error) {
      setTickets(previous);

      notify(
        "error",
        error instanceof Error ? error.message : "Unable to update tickets.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function applySelectedPriority(nextPriority: TicketPriorityType) {
    if (!selected.length) {
      return;
    }

    const previous = tickets;

    try {
      setBusy(true);

      setTickets((rows) =>
        rows.map((row) =>
          selected.includes(row.id)
            ? {
                ...row,

                priorityType: nextPriority,
              }
            : row,
        ),
      );

      /*
       * Important:
       * priority TYPE does not overwrite
       * the separate priority NUMBER.
       */
      await patchTickets(
        selected.map((id) => ({
          id,

          priorityType: nextPriority,
        })),
      );

      setSelected([]);

      setBulkDialog(undefined);

      notify("success", `Priority changed to ${nextPriority}`);
    } catch (error) {
      setTickets(previous);

      notify(
        "error",
        error instanceof Error ? error.message : "Unable to update tickets.",
      );
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     PRIORITY RAIL RESIZE

     This is the separate draggable/resizable column.

     Drag the lower grip:
       - down = extend priority over more rows
       - up   = shrink priority

     All covered rows receive the same DB priority_number.
     ======================================================= */

  function beginPriorityResize(
    event: React.PointerEvent<HTMLButtonElement>,

    group: PriorityGroup,
  ) {
    if (busy) {
      return;
    }

    event.preventDefault();

    const element = event.currentTarget.parentElement;

    const elementHeight =
      element?.getBoundingClientRect().height ?? 99.2 * group.count;

    const rowHeight = Math.max(1, elementHeight / group.count);

    const startY = event.clientY;

    const startCount = group.count;

    const maxCount = visible.length - group.startIndex;

    let finalCount = startCount;

    setResizePreview({
      key: group.key,

      count: startCount,
    });

    function move(moveEvent: PointerEvent) {
      const delta = moveEvent.clientY - startY;

      const rowsMoved = Math.round(delta / rowHeight);

      finalCount = Math.max(1, Math.min(maxCount, startCount + rowsMoved));

      setResizePreview({
        key: group.key,

        count: finalCount,
      });
    }

    async function finish() {
      window.removeEventListener("pointermove", move);

      window.removeEventListener("pointerup", finish);

      setResizePreview(undefined);

      if (finalCount === startCount) {
        return;
      }

      const updates = new Map<string, TicketPatch>();

      /*
       * Rows now covered by this priority.
       */
      visible
        .slice(group.startIndex, group.startIndex + finalCount)
        .forEach((ticket) => {
          updates.set(ticket.id, {
            id: ticket.id,

            priorityNumber: group.priorityNumber,
          });
        });

      /*
       * If shrinking, rows released by
       * the group join the following group.
       */
      if (finalCount < startCount) {
        const following = visible[group.startIndex + startCount];

        const releasedPriority =
          following?.priorityNumber ?? group.priorityNumber + 1;

        visible
          .slice(
            group.startIndex + finalCount,

            group.startIndex + startCount,
          )
          .forEach((ticket) => {
            updates.set(ticket.id, {
              id: ticket.id,

              priorityNumber: releasedPriority,
            });
          });
      }

      const patches = Array.from(updates.values());

      const previous = tickets;

      const patchMap = new Map(
        patches.map((patch) => [patch.id, patch.priorityNumber!]),
      );

      setTickets((rows) =>
        rows.map((row) =>
          patchMap.has(row.id)
            ? {
                ...row,

                priorityNumber: patchMap.get(row.id)!,
              }
            : row,
        ),
      );

      try {
        setBusy(true);

        await patchTickets(patches);

        notify(
          "success",
          `Priority ${group.priorityNumber} now covers ${finalCount} ticket${
            finalCount === 1 ? "" : "s"
          }`,
        );
      } catch (error) {
        setTickets(previous);

        notify(
          "error",
          error instanceof Error ? error.message : "Unable to update priority.",
        );
      } finally {
        setBusy(false);
      }
    }

    window.addEventListener("pointermove", move);

    window.addEventListener("pointerup", finish, {
      once: true,
    });
  }

  /* =======================================================
     CREATOR-ONLY RENAME
     ======================================================= */

  function canRename(ticket: SafeTicketRow) {
    return String(ticket.createdById ?? "") === String(currentUserId);
  }

  async function changeTicketName(
    body:
      | {
          action: "rename";

          ticketId: string;

          title: string;
        }
      | {
          action: "undo";

          ticketId: string;
        },
  ) {
    const response = await fetch(`/api/ticket-list/${portal}/name`, {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(body),
    });

    const result = (await response.json().catch(() => ({}))) as {
      error?: string;

      title?: string;

      history?: string[];
    };

    if (!response.ok) {
      throw new Error(result.error || "Unable to update ticket name.");
    }

    return {
      title: result.title ?? "",

      history: Array.isArray(result.history)
        ? result.history.filter(
            (item): item is string => typeof item === "string",
          )
        : [],
    };
  }

  function openRename(ticket: SafeTicketRow) {
    if (!canRename(ticket)) {
      return;
    }

    setRenameId(ticket.id);

    setRenameValue("");

    setRenameConfirmationOpen(false);
  }

  function requestRename() {
    const value = renameValue.trim();

    const row = tickets.find((ticket) => ticket.id === renameId);

    if (!row || !canRename(row) || !value) {
      return notify("error", "Enter a valid ticket title");
    }

    if (
      tickets.some(
        (ticket) =>
          ticket.id !== row.id &&
          ticket.title.toLowerCase() === value.toLowerCase(),
      )
    ) {
      return notify("error", "Ticket with the same title exists");
    }

    setRenameConfirmationOpen(true);
  }

  async function confirmRename() {
    const value = renameValue.trim();

    const row = tickets.find((ticket) => ticket.id === renameId);

    if (!row || !canRename(row) || !value) {
      return;
    }

    try {
      setBusy(true);

      const updated = await changeTicketName({
        action: "rename",

        ticketId: row.id,

        title: value,
      });

      setTickets((items) =>
        items.map((ticket) =>
          ticket.id === row.id
            ? {
                ...ticket,

                title: updated.title,

                history: updated.history,
              }
            : ticket,
        ),
      );

      setRenameConfirmationOpen(false);

      setRenameId(undefined);

      setRenameValue("");

      notify("rename", "Ticket name updated successfully");
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Unable to update ticket.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function undoRename(ticket: SafeTicketRow) {
    if (!canRename(ticket) || ticket.history.length === 0) {
      return;
    }

    try {
      setBusy(true);

      const updated = await changeTicketName({
        action: "undo",

        ticketId: ticket.id,
      });

      setTickets((rows) =>
        rows.map((item) =>
          item.id === ticket.id
            ? {
                ...item,

                title: updated.title,

                history: updated.history,
              }
            : item,
        ),
      );

      notify("success", "Previous ticket name restored");
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Unable to update ticket.",
      );
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     FILES
     ======================================================= */

  async function openFiles(ticket: SafeTicketRow) {
    setFilesModal({
      ticketId: ticket.id,

      title: ticket.title,

      loading: true,

      files: [],
    });

    try {
      const response = await fetch(ticketApiHref(portal, ticket.id), {
        method: "GET",

        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "Unable to load files.",
        );
      }

      setFilesModal({
        ticketId: ticket.id,

        title: ticket.title,

        loading: false,

        files: filesFromPayload(result),
      });
    } catch (error) {
      setFilesModal({
        ticketId: ticket.id,

        title: ticket.title,

        loading: false,

        files: [],

        error: error instanceof Error ? error.message : "Unable to load files.",
      });
    }
  }

  /* =======================================================
     DELETE
     ======================================================= */

  async function deleteTicket(id: string) {
    try {
      setBusy(true);

      const response = await fetch(
        `/api/ticket-list/${portal}?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Unable to delete ticket.");
      }

      setTickets((rows) => rows.filter((row) => row.id !== id));

      setSelected((ids) => ids.filter((item) => item !== id));

      setDeleteId(undefined);

      notify("success", "Ticket has been deleted");
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Unable to delete ticket.",
      );
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="space-y-5">
      {/* =================================================
          ORIGINAL TOOLBAR
          SEARCH STAYS ON SAME ROW
         ================================================= */}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((value) => !value)}
            className={cn(
              "ticket-tool-button",

              filtersOpen && "border-sky-500 text-sky-700",
            )}
          >
            <Filter size={18} />
            Filters
          </button>

          <button
            type="button"
            disabled={!selected.length || busy}
            onClick={() => setBulkDialog("status")}
            className="ticket-tool-button disabled:cursor-not-allowed disabled:opacity-45"
          >
            Change Status of Selected
          </button>

          <button
            type="button"
            disabled={!selected.length || busy}
            onClick={() => setBulkDialog("priority")}
            className="ticket-tool-button disabled:cursor-not-allowed disabled:opacity-45"
          >
            Change Priority Type of Selected
          </button>
        </div>

        <label className="relative ml-auto w-64 min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);

              setPage(1);
            }}
            className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0284C7]"
            placeholder="Search tickets..."
          />
        </label>
      </div>

      {/* =================================================
          ORIGINAL COLORED FILTER TAGS + DESCRIPTIONS
         ================================================= */}

      {filtersOpen && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <TagDropdown
              label="Status"
              value={status}
              options={statuses.map((item) => ({
                value: item,

                label: item,

                color: statusColors[item],

                description: statusDescriptions[item],
              }))}
              onChange={(value) => {
                setStatus(value as "All" | TicketStatus);

                setPage(1);
              }}
            />

            <TagDropdown
              label="Priority Type"
              value={priority}
              options={priorityTypes.map((item) => ({
                value: item,

                label: item,

                color: priorityTypeColors[item],

                description: ticketPriorityDescriptions[item],
              }))}
              onChange={(value) => {
                setPriority(value as "All" | TicketPriorityType);

                setPage(1);
              }}
            />

            <TagDropdown
              label="Ticket Type"
              value={type}
              options={ticketTypes.map((item) => ({
                value: item,

                label: item,

                color: ticketTypeColors[item],

                description: ticketTypeDescriptions[item],
              }))}
              onChange={(value) => {
                setType(value as "All" | TicketType);

                setPage(1);
              }}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={
                status === "All" &&
                type === "All" &&
                priority === "All" &&
                !query.trim()
              }
              onClick={() => {
                setStatus("All");

                setType("All");

                setPriority("All");

                setQuery("");

                setPage(1);
              }}
              className="self-end rounded-lg border border-red-500 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-transparent"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {/* =================================================
          TABLE
         ================================================= */}

      <div className="ticket-table-frame">
        {/* ===============================================
            SEPARATE DRAGGABLE PRIORITY RAIL
           =============================================== */}

        <aside className="priority-rail">
          <div className="priority-rail-title">Priority</div>

          {priorityGroups.map((group) => {
            const preview =
              resizePreview?.key === group.key ? resizePreview : undefined;

            return (
              <div
                key={group.key}
                className="priority-drop group"
                style={{
                  height: `${group.count * 6.2}rem`,
                }}
              >
                {preview && (
                  <div
                    className="pointer-events-none absolute inset-x-1 top-1 z-10 rounded-md border-2 border-dashed border-cyan-500 bg-cyan-50/40"
                    style={{
                      height: `${preview.count * 6.2 - 0.5}rem`,
                    }}
                  />
                )}

                <Grip size={16} className="relative z-20 text-gray-400" />

                <strong className="relative z-20">
                  {group.priorityNumber}
                </strong>

                <span className="relative z-20 bg-slate-300" />

                <button
                  type="button"
                  disabled={busy}
                  title="Drag to extend or shrink this priority"
                  aria-label={`Resize priority ${group.priorityNumber}`}
                  onPointerDown={(event) => beginPriorityResize(event, group)}
                  className="absolute bottom-1 right-1/2 z-30 grid h-5 w-8 translate-x-1/2 touch-none place-items-center rounded-md border border-sky-200 bg-white text-sky-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus:opacity-100 disabled:cursor-not-allowed"
                >
                  <GripHorizontal size={14} />
                </button>
              </div>
            );
          })}

          {!visible.length && (
            <div className="priority-drop">
              <strong>-</strong>
            </div>
          )}

          <div className="h-[65px] border-t border-slate-200 bg-white" />
        </aside>

        {/* ===============================================
            ORIGINAL TABLE DESIGN
           =============================================== */}

        <div className="min-w-0 flex-1 overflow-x-auto">
          <table className="w-full min-w-[1420px] table-fixed text-left">
            <thead>
              <tr>
                <th className="w-14">
                  <input
                    type="checkbox"
                    className="ticket-checkbox"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(
                        allSelected
                          ? selected.filter((id) => !visibleIds.includes(id))
                          : Array.from(new Set([...selected, ...visibleIds])),
                      )
                    }
                    aria-label="Select all tickets"
                  />
                </th>

                <th className="w-[200px]">
                  <SortButton
                    label="Ticket Title"
                    sortKey="title"
                    sort={sort}
                    onSort={toggleSort}
                  />
                </th>

                <th className="w-[150px] text-center">
                  <SortButton
                    label="Priority Type"
                    sortKey="priorityType"
                    sort={sort}
                    onSort={toggleSort}
                    centered
                  />
                </th>

                <th className="w-[210px]">
                  <SortButton
                    label="Project"
                    sortKey="project"
                    sort={sort}
                    onSort={toggleSort}
                  />
                </th>

                <th className="w-[170px]">
                  <SortButton
                    label="Created By"
                    sortKey="createdBy"
                    sort={sort}
                    onSort={toggleSort}
                  />
                </th>

                <th className="w-[175px]">
                  <SortButton
                    label="Resource Assigned"
                    sortKey="assignedTo"
                    sort={sort}
                    onSort={toggleSort}
                  />
                </th>

                <th className="w-[130px]">
                  <SortButton
                    label="Created"
                    sortKey="createdAt"
                    sort={sort}
                    onSort={toggleSort}
                  />
                </th>

                <th className="w-[175px]">
                  <SortButton
                    label="Deadline"
                    sortKey="dueDate"
                    sort={sort}
                    onSort={toggleSort}
                  />
                </th>

                <th className="w-[145px] text-center">
                  <SortButton
                    label="Status"
                    sortKey="status"
                    sort={sort}
                    onSort={toggleSort}
                    centered
                  />
                </th>

                <th className="w-28 text-center" />
              </tr>
            </thead>

            <tbody>
              {visible.map((ticket, index) => {
                const ticketStatus = normalizeTicketStatus(ticket.status);

                const creatorCanRename = canRename(ticket);

                const detailHref = `${detailBaseHref}/${encodeURIComponent(
                  ticket.id,
                )}`;

                const editHref = editTicketHref(
                  portal,
                  ticket.id,
                  detailBaseHref,
                  draftsBaseHref,
                );

                return (
                  <tr
                    key={ticket.id}
                    className={cn(
                      index % 2 && "bg-gray-50/50",

                      selected.includes(ticket.id) &&
                        "outline outline-2 -outline-offset-2 outline-slate-400",
                    )}
                  >
                    <td>
                      <input
                        type="checkbox"
                        className="ticket-checkbox"
                        checked={selected.includes(ticket.id)}
                        onChange={() =>
                          setSelected((ids) =>
                            ids.includes(ticket.id)
                              ? ids.filter((id) => id !== ticket.id)
                              : [...ids, ticket.id],
                          )
                        }
                        aria-label={`Select ${ticket.title}`}
                      />
                    </td>

                    {/* =================================
                          ORIGINAL TITLE HOVER
                          CREATOR ONLY
                         ================================= */}

                    <td className="overflow-visible">
                      <div className="ticket-title-wrap">
                        <Link
                          href={detailHref}
                          title={ticket.title}
                          className="block truncate font-semibold text-slate-900"
                        >
                          {ticket.title}
                        </Link>

                        {creatorCanRename ? (
                          <div className="ticket-title-popover">
                            <strong>{ticket.title}</strong>

                            <div>
                              {/* Same original FilePenLine icon,
                                    now opens Rename directly. */}
                              <button
                                type="button"
                                title="Rename ticket"
                                disabled={busy}
                                onClick={() => openRename(ticket)}
                              >
                                <FilePenLine size={17} />
                              </button>

                              <button
                                type="button"
                                title="Review previous names"
                                disabled={busy}
                                onClick={() => setHistoryId(ticket.id)}
                              >
                                <History size={17} />
                              </button>

                              <button
                                type="button"
                                title="Undo last rename"
                                disabled={busy || ticket.history.length === 0}
                                onClick={() => void undoRename(ticket)}
                              >
                                <Undo2 size={17} />
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </td>

                    {/* =================================
                          ORIGINAL FULLY COLORED PRIORITY TAG
                         ================================= */}

                    <td className="text-center">
                      <span
                        className={cn(
                          "ticket-pill",

                          priorityTypeColors[ticket.priorityType],
                        )}
                      >
                        {ticket.priorityType}
                      </span>
                    </td>

                    <td>
                      <span className="flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600">
                          {ticket.project?.charAt(0) || "-"}
                        </span>

                        <span className="truncate">
                          {ticket.project || "Not set"}
                        </span>
                      </span>
                    </td>

                    <td>
                      <PersonCell name={ticket.createdBy} />
                    </td>

                    <td>
                      <PersonCell name={ticket.assignedTo} />
                    </td>

                    <td>{formatDate(ticket.createdAt)}</td>

                    <td>
                      {formatDate(ticket.dueDate)}

                      <small className="mt-1 block text-slate-500">
                        {timeRemainingLabel(ticket.dueDate)}
                      </small>
                    </td>

                    {/* =================================
                          ORIGINAL FULLY COLORED STATUS TAG
                         ================================= */}

                    <td className="text-center">
                      <span
                        className={cn(
                          "ticket-pill",

                          statusColors[ticketStatus],
                        )}
                      >
                        {ticketStatus}
                      </span>
                    </td>

                    {/* =================================
                          ORIGINAL ICONS AFTER STATUS:
                          FILES / EDIT / DELETE
                         ================================= */}

                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => void openFiles(ticket)}
                          className="row-icon hover:!bg-transparent hover:text-[#0284C7]"
                          title="Ticket files"
                        >
                          <FolderOpen />
                        </button>

                        <Link
                          href={editHref}
                          className="row-icon hover:!bg-transparent hover:text-[#0284C7]"
                          title="Edit ticket"
                        >
                          <Edit3 />
                        </Link>

                        <button
                          type="button"
                          onClick={() => setDeleteId(ticket.id)}
                          className="row-icon text-slate-500 hover:!bg-transparent hover:!text-red-600"
                          title="Delete ticket"
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!visible.length && (
            <div className="py-20 text-center text-slate-500">
              No tickets match your search and filters.
            </div>
          )}

          {/* =============================================
              ORIGINAL PAGINATION APPEARANCE
             ============================================= */}

          <footer className="flex items-center justify-center gap-4 border-t border-slate-200 px-5 py-4 text-sm text-slate-500">
            <span>
              {filtered.length ? start + 1 : 0}
              {" - "}
              {Math.min(start + pageSize, filtered.length)}
              {" of "}
              {filtered.length}
            </span>

            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));

                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2"
            >
              <option value={10}>10 per page</option>

              <option value={25}>25 per page</option>

              <option value={50}>50 per page</option>
            </select>

            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              className="row-icon disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronDown className="rotate-90" />
            </button>

            <button
              type="button"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
              className="row-icon disabled:opacity-50"
              aria-label="Next page"
            >
              <ChevronDown className="-rotate-90" />
            </button>
          </footer>
        </div>
      </div>

      {/* =================================================
          RENAME
         ================================================= */}

      {renameId && !renameConfirmationOpen && (
        <div className="modal-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-title"
            className="ticket-modal !w-[675px]"
          >
            <h2
              id="rename-title"
              className="text-[1.65rem] font-bold text-slate-700"
            >
              Rename
            </h2>

            <div className="mt-5">
              <span className="mb-2 block text-base font-semibold text-slate-700">
                Previous Title
              </span>

              <div className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm">
                {tickets.find((ticket) => ticket.id === renameId)?.title}
              </div>

              <div className="mt-2 text-right text-sm text-slate-500">
                {tickets.find((ticket) => ticket.id === renameId)?.title
                  .length ?? 0}
                /200 characters
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-base font-semibold text-slate-700">
                New Title
              </span>

              <input
                autoFocus
                maxLength={200}
                className="field !min-h-14 !px-4 !text-base"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    requestRename();
                  }
                }}
                placeholder="Write new title"
              />

              <span className="mt-2 block text-right text-sm text-slate-500">
                {renameValue.length}
                /200 characters
              </span>
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-cyan-500 px-5 py-3 text-sm font-bold text-[#0284C7] hover:bg-[#E6F8FB]"
                onClick={() => {
                  setRenameId(undefined);

                  setRenameValue("");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="button-primary !px-6 !py-3"
                onClick={requestRename}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          RENAME CONFIRMATION
         ================================================= */}

      {renameId && renameConfirmationOpen && (
        <div className="modal-backdrop">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="rename-confirmation-title"
            className="ticket-modal !w-[390px] !p-5"
          >
            <h2
              id="rename-confirmation-title"
              className="text-[1.65rem] font-bold text-slate-700"
            >
              Confirmation
            </h2>

            <p className="mt-5 text-base font-semibold text-slate-700">
              Do you want to rename the title?
            </p>

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                disabled={busy}
                className="rounded-xl border border-cyan-500 px-7 py-3 text-sm font-bold text-[#0284C7] hover:bg-[#E6F8FB]"
                onClick={() => setRenameConfirmationOpen(false)}
              >
                No
              </button>

              <button
                type="button"
                disabled={busy}
                className="button-primary !px-7 !py-3"
                onClick={() => void confirmRename()}
              >
                {busy ? "Renaming..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          TITLE HISTORY
         ================================================= */}

      {historyId && (
        <div className="modal-backdrop">
          <div role="dialog" aria-modal="true" className="ticket-modal">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Previous Ticket Names</h2>

              <button type="button" onClick={() => setHistoryId(undefined)}>
                <X />
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {tickets
                .find((item) => item.id === historyId)
                ?.history.map((name, index) => (
                  <div
                    key={`${name}-${index}`}
                    className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm"
                  >
                    <Clock3 size={16} className="text-sky-600" />

                    {name}
                  </div>
                ))}

              {!tickets.find((item) => item.id === historyId)?.history
                .length && (
                <p className="text-sm text-slate-500">
                  No previous name changes.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          BULK CHANGE
         ================================================= */}

      {bulkDialog && (
        <div className="modal-backdrop">
          <div role="dialog" aria-modal="true" className="ticket-modal">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Change {bulkDialog === "status" ? "Status" : "Priority Type"}
              </h2>

              <button type="button" onClick={() => setBulkDialog(undefined)}>
                <X />
              </button>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              Apply to {selected.length} selected ticket
              {selected.length === 1 ? "" : "s"}.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              {bulkDialog === "status"
                ? statuses.map((item) => (
                    <button
                      type="button"
                      key={item}
                      disabled={busy}
                      className={cn(
                        "rounded-full px-3 py-2 text-xs font-medium",

                        statusColors[item],
                      )}
                      onClick={() => void applySelectedStatus(item)}
                    >
                      {item}
                    </button>
                  ))
                : priorityTypes.map((item) => (
                    <button
                      type="button"
                      key={item}
                      disabled={busy}
                      className={cn(
                        "rounded-full px-3 py-2 text-xs font-medium",

                        priorityTypeColors[item],
                      )}
                      onClick={() => void applySelectedPriority(item)}
                    >
                      {item}
                    </button>
                  ))}
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          FILES
         ================================================= */}

      {filesModal && (
        <TicketFilesModal
          state={filesModal}
          onClose={() => setFilesModal(undefined)}
        />
      )}

      {/* =================================================
          DELETE
         ================================================= */}

      {deleteId && (
        <div className="modal-backdrop">
          <div role="alertdialog" aria-modal="true" className="ticket-modal">
            <h2 className="text-lg font-semibold text-gray-900">
              Delete Ticket
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <strong>
                “{tickets.find((ticket) => ticket.id === deleteId)?.title}”
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                className="button-secondary"
                onClick={() => setDeleteId(undefined)}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={busy}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                onClick={() => void deleteTicket(deleteId)}
              >
                {busy ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          ORIGINAL TOASTS
         ================================================= */}

      {toast && (
        <div
          role="status"
          className={cn(
            "ticket-toast",

            toast.kind === "success"
              ? "ticket-toast-success"
              : toast.kind === "rename"
                ? "ticket-toast-rename"
                : "ticket-toast-error",
          )}
        >
          <p className="text-sm">{toast.text}</p>

          <button
            type="button"
            className="ml-auto"
            aria-label="Dismiss notification"
            onClick={() => setToast(undefined)}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   TIME REMAINING
   ========================================================= */

function timeRemainingLabel(dueDate: string) {
  const date = new Date(dueDate);

  if (!dueDate || Number.isNaN(date.getTime())) {
    return "Not set";
  }

  const diffDays = Math.ceil((date.getTime() - Date.now()) / 86_400_000);

  if (diffDays === 0) {
    return "Due today";
  }

  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} day${
      Math.abs(diffDays) === 1 ? "" : "s"
    }`;
  }

  return `${diffDays} day${diffDays === 1 ? "" : "s"} remaining`;
}






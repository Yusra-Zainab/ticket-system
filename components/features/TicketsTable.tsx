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
  FileText,
  FilePenLine,
  Filter,
  FolderOpen,
  Grip,
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
import type { Ticket, TicketAttachment } from "@/types";
import { useApp } from "@/components/providers/AppProvider";

const statuses = [
  "Open",
  "Reviewed",
  "Assigned",
  "Active",
  "Blocked",
  "Awaiting",
  "QA",
  "Validation",
  "Resolved",
  "Closed",
  "Reopened",
  "Cancelled",
] as const;
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
const priorities = [
  { value: 1, label: "Critical", color: "#E62B2B" },
  { value: 2, label: "High", color: "#F45A0A" },
  { value: 3, label: "Medium", color: "#E07B00" },
  { value: 4, label: "Low", color: "#08A464" },
  { value: 5, label: "Not Assigned", color: "#718096" },
] as const;
type TicketStatus = (typeof statuses)[number];
type TicketType = (typeof ticketTypes)[number];
type Priority = (typeof priorities)[number]["value"];
type FileCategory = "Photos and videos" | "Files" | "Links";
type TicketFile = { id: string; category: FileCategory; name: string; detail: string; date: string; url: string };
type SortKey =
  | "title"
  | "priority"
  | "project"
  | "createdBy"
  | "assignedTo"
  | "created"
  | "dueDate"
  | "status";
type TicketRow = Omit<Ticket, "status" | "priority"> & {
  status: TicketStatus;
  priority: Priority;
  priorityNumber: number;
  type: TicketType;
  createdBy: string;
  history: string[];
};

const statusColors: Record<TicketStatus, string> = {
  Open: "bg-violet-600 text-white ring-1 ring-violet-700",
  Reviewed: "bg-slate-700 text-white ring-1 ring-slate-800",
  Assigned: "bg-blue-600 text-white ring-1 ring-blue-700",
  Active: "bg-teal-600 text-white ring-1 ring-teal-700",
  Blocked: "bg-orange-600 text-white ring-1 ring-orange-700",
  Awaiting: "bg-pink-600 text-white ring-1 ring-pink-700",
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
  Active: "Work is actively moving forward",
  Blocked: "Waiting on a dependency or decision",
  Awaiting: "Waiting for a reply, input, or approval",
  QA: "Under testing and quality checks",
  Validation: "Being verified before completion",
  Resolved: "A fix or response is in place",
  Closed: "Finished and no longer active",
  Reopened: "Opened again after a previous resolution",
  Cancelled: "Intentionally stopped and no longer pursued",
};
const priorityColors = {
  1: "bg-red-600 text-white ring-1 ring-red-700",
  2: "bg-orange-600 text-white ring-1 ring-orange-700",
  3: "bg-yellow-600 text-white ring-1 ring-yellow-700",
  4: "bg-green-600 text-white ring-1 ring-green-700",
  5: "bg-gray-400 text-white ring-1 ring-gray-500",
} as const;
const ticketTypeColors: Record<TicketType, string> = { Bug: "bg-red-600 text-white ring-red-700", Task: "bg-blue-600 text-white ring-blue-700", "Change Request": "bg-violet-600 text-white ring-violet-700", "New Feature": "bg-purple-600 text-white ring-purple-700", Feedback: "bg-orange-500 text-white ring-orange-600", "Support Request": "bg-teal-600 text-white ring-teal-700", "UI/UX Issue": "bg-pink-600 text-white ring-pink-700", "Content Update": "bg-emerald-600 text-white ring-emerald-700", "Technical Issue": "bg-amber-600 text-white ring-amber-700", "Testing / QA": "bg-cyan-600 text-white ring-cyan-700", Maintenance: "bg-slate-500 text-white ring-slate-600", "Urgent Fix": "bg-red-700 text-white ring-red-800", "System Down": "bg-indigo-700 text-white ring-indigo-800" };
const fileCategories: FileCategory[] = ["Photos and videos", "Files", "Links"];
const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
const asAttachments = (ticket: TicketRow): TicketAttachment[] => {
  const data = (ticket.formData ?? {}) as Record<string, unknown>;
  return Array.isArray(data.attachments)
    ? data.attachments.filter(
        (item): item is TicketAttachment =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as TicketAttachment).id === "string" &&
          typeof (item as TicketAttachment).name === "string" &&
          typeof (item as TicketAttachment).url === "string",
      )
    : [];
};
const asLinks = (ticket: TicketRow): TicketFile[] => {
  const data = (ticket.formData ?? {}) as Record<string, unknown>;
  return asStringArray(data.urls).map((url, index) => ({
    id: `link-${ticket.id}-${index}`,
    category: "Links" as const,
    name: url.replace(/^https?:\/\//, ""),
    detail: "Linked reference",
    date: formatDate(String(data.updatedAt ?? ticket.created)),
    url,
  }));
};
const formatSize = (size: number) => {
  if (!size) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};
const ticketFiles = (ticket: TicketRow): TicketFile[] => [
  ...asAttachments(ticket).map((attachment) => {
    const isMedia =
      attachment.mimeType.startsWith("image/") ||
      attachment.mimeType.startsWith("video/");
    return {
      id: attachment.id,
      category: isMedia ? ("Photos and videos" as const) : ("Files" as const),
      name: attachment.name,
      detail: isMedia
        ? attachment.mimeType
            .split("/")[0]
            .replace(/^./, (c) => c.toUpperCase())
        : formatSize(attachment.size),
      date: formatDate(attachment.uploadedAt),
      url: attachment.url,
    };
  }),
  ...asLinks(ticket).map((link) => ({ ...link, detail: "External link" })),
];
const fileCategoryLabel: Record<FileCategory, string> = {
  "Photos and videos": "Photos and videos",
  Files: "Files",
  Links: "Links",
};
const toRows = (source: Ticket[]): TicketRow[] => source.map((ticket) => {
  const data = (ticket.formData ?? {}) as Record<string, unknown>;
  return {
    ...ticket,
    status: (ticket.status === "Critical" ? "Open" : ticket.status) as TicketStatus,
    priority: Math.min(ticket.priority, 4) as Priority,
    priorityNumber: Number(data.priorityNumber ?? ticket.priority) || ticket.priority,
    type: String(data.type ?? "Task") as TicketType,
    createdBy: String(data.createdBy ?? ticket.reporter ?? ""),
    history: [],
  };
});
const timeRemainingLabel = (dueDate: string) => {
  const date = new Date(dueDate);
  if (!dueDate || Number.isNaN(date.getTime())) return "Not set";
  const diffDays = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (diffDays === 0) return "Due today";
  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"}`;
  return `${diffDays} day${diffDays === 1 ? "" : "s"} remaining`;
};
export default function TicketsTable({ variant = "tickets", initialTickets }: { variant?: "tickets" | "drafts"; initialTickets?: Ticket[] }) {
  const { draftTickets, submittedTickets, removeStoredTicket } = useApp();
  const [tickets, setTickets] = useState(() => toRows(initialTickets ?? (variant === "drafts" ? draftTickets : submittedTickets)));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | TicketStatus>("All");
  const [type, setType] = useState<"All" | TicketType>("All");
  const [priority, setPriority] = useState<"All" | Priority>("All");
  const [selected, setSelected] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [bulkDialog, setBulkDialog] = useState<"status" | "priority">();
  const [renameId, setRenameId] = useState<string>();
  const [renameValue, setRenameValue] = useState("");
  const [renameConfirmationOpen, setRenameConfirmationOpen] = useState(false);
  const [historyId, setHistoryId] = useState<string>();
  const [deleteId, setDeleteId] = useState<string>();
  const [filesTicketId, setFilesTicketId] = useState<string>();
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  }>();
  const [toast, setToast] = useState<{
    kind: "success" | "error" | "rename";
    text: string;
  }>();

  const filtered = useMemo(
    () =>
      tickets
        .filter(
          (ticket) =>
            `${ticket.title} ${ticket.project} ${ticket.assignedTo} ${ticket.createdBy} ${ticket.type}`
              .toLowerCase()
              .includes(query.trim().toLowerCase()) &&
            (status === "All" || ticket.status === status) &&
            (type === "All" || ticket.type === type) &&
            (priority === "All" || ticket.priority === priority),
        )
        .sort((a, b) =>
          sort
            ? String(a[sort.key]).localeCompare(
                String(b[sort.key]),
                undefined,
                { numeric: true },
              ) * (sort.direction === "asc" ? 1 : -1)
            : 0,
        ),
    [tickets, query, status, type, priority, sort],
  );
  const visibleIds = filtered.map((ticket) => ticket.id);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const notify = (kind: "success" | "error" | "rename", text: string) => {
    setToast({ kind, text });
    if (kind !== "error")
      window.setTimeout(
        () => setToast(undefined),
        kind === "rename" ? 2000 : 3000,
      );
  };
  const patchTicket = async (id: string, payload: Record<string, unknown>) => {
    const response = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) return;
    let message = "Unable to update ticket.";
    try {
      const data = await response.json();
      if (typeof data?.error === "string") message = data.error;
    } catch {
      // keep default message
    }
    throw new Error(message);
  };
  const toggleSort = (key: SortKey) =>
    setSort((current) => ({
      key,
      direction:
        current?.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  const applySelected = async (patch: Partial<TicketRow>, message: string) => {
    if (!selected.length)
      return notify("error", "Select at least one ticket first");
    try {
      await Promise.all(selected.map((id) => {
        const payload =
          patch.status
            ? { status: patch.status }
            : patch.priority
              ? {
                  priorityType:
                    priorities.find((item) => item.value === patch.priority)?.label ?? "Low",
                  priorityNumber: patch.priority,
                }
              : patch;
        return patchTicket(id, payload);
      }));
      setTickets((rows) =>
        rows.map((row) =>
          selected.includes(row.id) ? { ...row, ...patch } : row,
        ),
      );
      setSelected([]);
      setBulkDialog(undefined);
      notify("success", message);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Unable to update ticket.");
    }
  };
  const reorderTicket = (draggedId: string, targetId: string) => {
    setSort(undefined);
    setTickets((rows) => {
      const from = rows.findIndex((row) => row.id === draggedId);
      const to = rows.findIndex((row) => row.id === targetId);
      if (from < 0 || to < 0 || from === to) return rows;
      const next = [...rows];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((row, index) => ({ ...row, priorityNumber: index + 1 }));
    });
  };
  const requestRename = () => {
    const value = renameValue.trim();
    const row = tickets.find((ticket) => ticket.id === renameId);
    if (!row || !value) return notify("error", "Enter a valid ticket title");
    if (
      tickets.some(
        (ticket) =>
          ticket.id !== row.id &&
          ticket.title.toLowerCase() === value.toLowerCase(),
      )
    )
      return notify("error", "Ticket with the same title exists");
    setRenameConfirmationOpen(true);
  };
  const confirmRename = () => {
    const value = renameValue.trim();
    const row = tickets.find((ticket) => ticket.id === renameId);
    if (!row || !value) return;
    setTickets((items) =>
      items.map((ticket) =>
        ticket.id === row.id
          ? {
              ...ticket,
              title: value,
              history: [ticket.title, ...ticket.history],
            }
          : ticket,
      ),
    );
    setRenameConfirmationOpen(false);
    setRenameId(undefined);
    setRenameValue("");
    notify("rename", "Ticket name updated successfully");
  };
  const undoRename = (id: string) =>
    setTickets((rows) =>
      rows.map((row) =>
        row.id === id && row.history.length
          ? { ...row, title: row.history[0], history: row.history.slice(1) }
          : row,
      ),
    );
  const deleteTicket = (id: string) => {
    setTickets((rows) => rows.filter((row) => row.id !== id));
    setSelected((ids) => ids.filter((item) => item !== id));
    setDeleteId(undefined);
    removeStoredTicket(id);
    notify("success", "Ticket has been deleted");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        {variant === "tickets" && <div className="flex flex-wrap gap-3">
          <button
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
            disabled={!selected.length}
            onClick={() => setBulkDialog("status")}
            className="ticket-tool-button disabled:cursor-not-allowed disabled:opacity-45"
          >
            Change Status of Selected
          </button>
          <button
            disabled={!selected.length}
            onClick={() => setBulkDialog("priority")}
            className="ticket-tool-button disabled:cursor-not-allowed disabled:opacity-45"
          >
            Change Priority Type of Selected
          </button>
        </div>}
        <label className="relative ml-auto w-full xl:w-64">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0284C7]"
            placeholder="Search tickets..."
          />
        </label>
      </div>
      {variant === "tickets" && filtersOpen && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4">
          <div className="grid gap-3 md:grid-cols-3"><TagDropdown label="Status" value={status} options={statuses.map((item) => ({ value: item, label: item, color: statusColors[item], description: statusDescriptions[item] }))} onChange={(value) => setStatus(value as typeof status)} /><TagDropdown label="Priority Type" value={String(priority)} options={priorities.map((item) => ({ value: String(item.value), label: item.label, color: priorityColors[item.value], description: ticketPriorityDescriptions[item.label] }))} onChange={(value) => setPriority(value === "All" ? "All" : Number(value) as Priority)} /><TagDropdown label="Ticket Type" value={type} options={ticketTypes.map((item) => ({ value: item, label: item, color: ticketTypeColors[item], description: ticketTypeDescriptions[item] }))} onChange={(value) => setType(value as typeof type)} /></div>
          <div className="flex justify-end">
          <button
            disabled={status === "All" && type === "All" && priority === "All"}
            onClick={() => {
              setStatus("All");
              setType("All");
              setPriority("All");
              setQuery("");
            }}
            className="self-end rounded-lg border border-red-500 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-transparent"
          >
            Clear filters
          </button>
          </div>
        </div>
      )}
      <div className="ticket-table-frame">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <table className="w-full min-w-[1500px] table-fixed text-left">
            <thead>
              <tr>
                <th className="w-24 text-center">Priority</th>
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
                    sortKey="priority"
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
                    sortKey="created"
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
                <th className="w-[145px]">
                  <SortButton
                    label="Status"
                    sortKey="status"
                    sort={sort}
                    onSort={toggleSort}
                    centered
                  />
                </th>
                <th className="w-20 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket, index) => {
                const priorityInfo = priorities.find(
                  (item) => item.value === ticket.priority,
                )!;
                return (
                  <tr
                    key={ticket.id}
                    draggable
                    onDragStart={(event) =>
                      event.dataTransfer.setData("text/ticket-id", ticket.id)
                    }
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) =>
                      reorderTicket(
                        event.dataTransfer.getData("text/ticket-id"),
                        ticket.id,
                      )
                    }
                    className={cn(
                      index % 2 && "bg-gray-50/50",
                      selected.includes(ticket.id) &&
                        "outline outline-2 -outline-offset-2 outline-slate-400",
                    )}
                  >
                    <td className="text-center">
                      <div className="flex cursor-grab flex-col items-center active:cursor-grabbing">
                        <Grip size={16} className="mb-1 text-gray-400" />
                        <strong className="text-sm font-medium text-gray-900">
                          {ticket.priorityNumber}
                        </strong>
                      </div>
                    </td>
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
                    <td>
                      <div className="ticket-title-wrap">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          title={ticket.title}
                          className="block truncate font-semibold text-slate-900"
                        >
                          {ticket.title}
                        </Link>
                        <div className="ticket-title-popover">
                          <strong>{ticket.title}</strong>
                          <div>
                            <Link
                              href={`/tickets/new?draft=${ticket.id}`}
                              title="Edit ticket"
                            >
                              <FilePenLine size={17} />
                            </Link>
                            <button
                              title="Review previous names"
                              onClick={() => setHistoryId(ticket.id)}
                            >
                              <History size={17} />
                            </button>
                            <button
                              title="Undo last rename"
                              disabled={!ticket.history.length}
                              onClick={() => undoRename(ticket.id)}
                            >
                              <Undo2 size={17} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={cn(
                          "ticket-pill",
                          priorityColors[ticket.priority],
                        )}
                      >
                        {priorityInfo.label}
                      </span>
                    </td>
                    <td>
                      <span className="flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600">
                          {ticket.project.charAt(0)}
                        </span>
                        <span className="truncate">{ticket.project}</span>
                      </span>
                    </td>
                    <td>
                      <PersonCell name={ticket.createdBy} />
                    </td>
                    <td>
                      <PersonCell name={ticket.assignedTo} />
                    </td>
                    <td>{formatDate(ticket.created)}</td>
                    <td>
                      {formatDate(ticket.dueDate)}
                      <small className="mt-1 block text-slate-500">
                        {timeRemainingLabel(ticket.dueDate)}
                      </small>
                    </td>
                    <td>
                      <span
                        className={cn(
                          "ticket-pill",
                          statusColors[ticket.status],
                        )}
                      >
                        {ticket.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        {variant === "tickets" && <button
                          onClick={() => setFilesTicketId(ticket.id)}
                          className="row-icon hover:!bg-transparent hover:text-[#0284C7]"
                          title="Ticket files"
                        >
                          <FolderOpen />
                        </button>}
                        <Link
                          href={`/tickets/new?draft=${ticket.id}`}
                          className="row-icon hover:!bg-transparent hover:text-[#0284C7]"
                          title="Edit ticket"
                        >
                          <Edit3 />
                        </Link>
                        <button
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
          {!filtered.length && (
            <div className="py-20 text-center text-slate-500">
              No tickets match your search and filters.
            </div>
          )}
          <footer className="flex items-center justify-center gap-4 border-t border-slate-200 px-5 py-4 text-sm text-slate-500">
            <span>1 - {filtered.length} of 3,037</span>
            <select className="rounded-lg border border-slate-300 px-4 py-2">
              <option>10 per page</option>
              <option>25 per page</option>
              <option>50 per page</option>
            </select>
            <button disabled className="row-icon disabled:opacity-50">
              <ChevronDown className="rotate-90" />
            </button>
            <button className="row-icon">
              <ChevronDown className="-rotate-90" />
            </button>
          </footer>
        </div>
      </div>
      {renameId && !renameConfirmationOpen && (
        <div className="modal-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-title"
            className="ticket-modal !w-[675px]"
          >
            <h2 id="rename-title" className="text-[1.65rem] font-bold text-slate-700">Rename</h2>
            <div className="mt-5">
              <span className="mb-2 block text-base font-semibold text-slate-700">Previous Title</span>
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
              <span className="mb-2 block text-base font-semibold text-slate-700">New Title</span>
              <input
                autoFocus
                maxLength={200}
                className="field !min-h-14 !px-4 !text-base"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && requestRename()}
                placeholder="Write new title"
              />
              <span className="mt-2 block text-right text-sm text-slate-500">{renameValue.length}/200 characters</span>
            </label>
            {/* <div className="mt-4">
              <span className="label">Previous Names</span>
              <div className="max-h-24 overflow-y-auto rounded-lg bg-gray-50 p-2">
                {tickets
                  .find((ticket) => ticket.id === renameId)
                  ?.history.map((name, index) => (
                    <div
                      key={`${name}-${index}`}
                      className="border-b border-gray-200 py-1 text-sm text-gray-600 last:border-0"
                    >
                      {name}
                    </div>
                  ))}
                {!tickets.find((ticket) => ticket.id === renameId)?.history
                  .length && (
                  <p className="py-1 text-sm text-gray-400">
                    No previous names
                  </p>
                )}
              </div>
            </div> */}
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-xl border border-cyan-500 px-5 py-3 text-sm font-bold text-[#0284C7] hover:bg-[#E6F8FB]"
                onClick={() => { setRenameId(undefined); setRenameValue(""); }}
              >
                Cancel
              </button>
              <button className="button-primary !px-6 !py-3" onClick={requestRename}>
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
      {renameId && renameConfirmationOpen && <div className="modal-backdrop"><div role="alertdialog" aria-modal="true" aria-labelledby="rename-confirmation-title" className="ticket-modal !w-[390px] !p-5"><h2 id="rename-confirmation-title" className="text-[1.65rem] font-bold text-slate-700">Confirmation</h2><p className="mt-5 text-base font-semibold text-slate-700">Do u want to rename the title</p><div className="mt-5 flex items-center justify-between"><button className="rounded-xl border border-cyan-500 px-7 py-3 text-sm font-bold text-[#0284C7] hover:bg-[#E6F8FB]" onClick={() => setRenameConfirmationOpen(false)}>No</button><button className="button-primary !px-7 !py-3" onClick={confirmRename}>Yes</button></div></div></div>}
      {historyId && (
        <div className="modal-backdrop">
          <div role="dialog" aria-modal="true" className="ticket-modal">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Previous Ticket Names</h2>
              <button onClick={() => setHistoryId(undefined)}>
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
      {bulkDialog && (
        <div className="modal-backdrop">
          <div role="dialog" aria-modal="true" className="ticket-modal">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Change {bulkDialog === "status" ? "Status" : "Priority Type"}
              </h2>
              <button onClick={() => setBulkDialog(undefined)}>
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
                      key={item}
                      className={cn(
                        "rounded-full px-3 py-2 text-xs font-medium",
                        statusColors[item],
                      )}
                      onClick={() =>
                        applySelected(
                          { status: item },
                          `Status changed to ${item}`,
                        )
                      }
                    >
                      {item}
                    </button>
                  ))
                : priorities.map((item) => (
                    <button
                      key={item.value}
                      className={cn(
                        "rounded-full px-3 py-2 text-xs font-medium",
                        priorityColors[item.value],
                      )}
                      onClick={() =>
                        applySelected(
                          { priority: item.value },
                          `Priority changed to ${item.label}`,
                        )
                      }
                    >
                      {item.label}
                    </button>
                  ))}
            </div>
          </div>
        </div>
      )}
      {filesTicketId && <TicketFilesModal ticket={tickets.find((item) => item.id === filesTicketId)!} onClose={() => setFilesTicketId(undefined)} />}
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
                className="button-secondary"
                onClick={() => setDeleteId(undefined)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                onClick={() => deleteTicket(deleteId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
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
          {/* {toast.kind === "error" ? (
            <XCircle className="shrink-0" />
          ) : (
            <CheckCircle className="shrink-0" />
          )} */}
          <p className="text-sm">{toast.text}</p>
          <button
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

function TicketFilesModal({ ticket, onClose }: { ticket: TicketRow; onClose: () => void }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [category, setCategory] = useState<FileCategory>();
  const [query, setQuery] = useState("");
  const files = ticketFiles(ticket);
  const visibleCategories = category ? [category] : fileCategories;
  const matches = (file: TicketFile) =>
    !query.trim() ||
    `${file.name} ${file.detail} ${file.url}`.toLowerCase().includes(query.toLowerCase());
  const reset = () => { setCategory(undefined); setQuery(""); setSearchOpen(false); };

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div role="dialog" aria-modal="true" aria-labelledby="ticket-files-title" className="ticket-modal !max-h-[90vh] !w-[1035px] overflow-y-auto !p-0">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><div><h2 id="ticket-files-title" className="text-2xl font-bold text-slate-700">Files</h2><p className="mt-0.5 max-w-2xl truncate text-xs text-slate-400">{ticket.title}</p></div><button onClick={onClose} className="row-icon hover:!bg-transparent hover:text-[#0284C7]" aria-label="Close files"><X /></button></div>
      <div className="p-5">
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
          <label className="flex h-14 items-center"><input value={query} onFocus={() => setSearchOpen(true)} onClick={() => setSearchOpen(true)} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 px-4 text-lg text-slate-700 outline-none placeholder:text-slate-500" placeholder="Search in files" /><span className="grid h-full w-16 place-items-center border-l border-slate-300 text-slate-600"><Search size={27} /></span></label>
          {searchOpen && !category && <div className="flex flex-wrap gap-3 border-t border-slate-200 px-4 py-3">{fileCategories.map((item) => <button key={item} onClick={() => setCategory(item)} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-[#0284C7] hover:text-white">{fileCategoryLabel[item]}</button>)}</div>}
        </div>
        {category && <div className="mt-3 flex justify-start"><button onClick={reset} className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-500 hover:text-cyan-600"><ArrowRight className="rotate-180" size={18} />Back</button></div>}
        <div className="mt-3 space-y-5">{files.length ? visibleCategories.map((item) => { const sectionFiles = files.filter((file) => file.category === item && matches(file)); return <section key={item}><div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-700">{item}</h3>{!category && <button onClick={() => setCategory(item)} className="inline-flex items-center gap-2 text-base font-semibold text-cyan-500 hover:text-cyan-600">See All<ArrowRight size={20} /></button>}</div>{sectionFiles.length ? item === "Photos and videos" ? <div className="flex flex-wrap gap-3">{sectionFiles.slice(0, category ? undefined : 5).map((file) => <a key={file.id} href={file.url} target="_blank" rel="noreferrer" title={file.name} className="group block w-32"><span className="grid h-20 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 group-hover:border-sky-400"><FileImage className="text-sky-500" /></span><span className="mt-2 inline-flex rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200">{file.category}</span><span className="mt-1 block truncate text-xs text-slate-500 group-hover:text-sky-600">{file.name}</span></a>)}</div> : <div className="space-y-3">{sectionFiles.slice(0, category ? undefined : 2).map((file) => <TicketFileRow key={file.id} file={file} />)}</div> : <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">No matching {item.toLowerCase()}.</p>}</section>; }) : <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No attachments have been uploaded for this ticket yet.</p>}</div>
      </div>
    </div>
  </div>;
}

function TicketFileRow({ file }: { file: TicketFile }) {
  const icon = file.category === "Links"
    ? <ExternalLink className="text-cyan-600" />
    : file.name.endsWith(".pdf")
      ? <FileText className="text-red-500" />
      : <File className="text-blue-600" />;
  return <a href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 hover:border-sky-300 hover:bg-sky-50"><span className="grid size-11 shrink-0 place-items-center">{icon}</span><span className="min-w-0 flex-1"><span className="mb-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">{file.category}</span><strong className="block truncate text-base font-medium text-slate-700">{file.name}</strong><span className="block truncate text-sm text-slate-500">{file.detail}</span></span><time className="w-28 shrink-0 text-right text-sm leading-5 text-slate-500">{file.date.replace(" ", "\n")}</time></a>;
}

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
        <div className="absolute z-30 mt-1 grid max-h-64 w-full gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
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

function SortButton({
  label,
  sortKey,
  sort,
  onSort,
  centered = false,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; direction: "asc" | "desc" } | undefined;
  onSort: (key: SortKey) => void;
  centered?: boolean;
}) {
  return (
    <button
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

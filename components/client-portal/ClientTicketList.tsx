"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Edit3,
  Filter,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

import { usePageSearch } from "@/components/providers/PageSearchProvider";
import {
  ticketPriorityDescriptions,
  ticketTypeDescriptions,
} from "@/lib/statusOptions";
import { cn } from "@/lib/utils";
import type {
  ClientPortalTicket,
  ClientTicketPriority,
  ClientTicketStatus,
  ClientTicketType,
} from "@/types/clientPortal";

const statuses: ClientTicketStatus[] = [
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
];

const ticketTypes: ClientTicketType[] = [
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
];

const priorities: ClientTicketPriority[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
  "Not Assigned",
];

const statusColors: Record<ClientTicketStatus, string> = {
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

const statusDescriptions: Record<ClientTicketStatus, string> = {
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

const priorityColors: Record<ClientTicketPriority, string> = {
  Critical: "bg-red-600 text-white ring-1 ring-red-700",
  High: "bg-orange-600 text-white ring-1 ring-orange-700",
  Medium: "bg-yellow-600 text-white ring-1 ring-yellow-700",
  Low: "bg-green-600 text-white ring-1 ring-green-700",
  "Not Assigned": "bg-gray-400 text-white ring-1 ring-gray-500",
};

const ticketTypeColors: Record<ClientTicketType, string> = {
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

const priorityNumber: Record<ClientTicketPriority, number> = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4,
  "Not Assigned": 0,
};

type SortKey =
  | "title"
  | "priority"
  | "project"
  | "reporter"
  | "assignee"
  | "createdAt"
  | "dueDate"
  | "status";

type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

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

function timeRemainingLabel(value: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  const diffDays = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (diffDays === 0) return "Due today";
  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return `Overdue by ${days} day${days === 1 ? "" : "s"}`;
  }
  return `${diffDays} day${diffDays === 1 ? "" : "s"} remaining`;
}

export default function ClientTicketList({
  tickets,
  drafts = false,
}: {
  tickets: ClientPortalTicket[];
  drafts?: boolean;
}) {
  const { query, setQuery } = usePageSearch();

  const [status, setStatus] = useState<"All" | ClientTicketStatus>("All");
  const [type, setType] = useState<"All" | ClientTicketType>("All");
  const [priority, setPriority] = useState<"All" | ClientTicketPriority>("All");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<SortState>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const rows = tickets.filter((ticket) => {
      const matchesSearch =
        !normalized ||
        `${ticket.id} ${ticket.title} ${ticket.project} ${ticket.assignee} ${ticket.reporter} ${ticket.type}`
          .toLowerCase()
          .includes(normalized);

      return (
        matchesSearch &&
        (drafts || status === "All" || ticket.status === status) &&
        (drafts || type === "All" || ticket.type === type) &&
        (drafts || priority === "All" || ticket.priority === priority)
      );
    });

    if (!sort) return rows;

    return [...rows].sort((a, b) => {
      let left: string | number = "";
      let right: string | number = "";

      switch (sort.key) {
        case "priority":
          left = priorityNumber[a.priority];
          right = priorityNumber[b.priority];
          break;
        case "createdAt":
        case "dueDate":
          left = new Date(a[sort.key] || 0).getTime() || 0;
          right = new Date(b[sort.key] || 0).getTime() || 0;
          break;
        default:
          left = String(a[sort.key] ?? "");
          right = String(b[sort.key] ?? "");
      }

      const result =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), undefined, {
              numeric: true,
              sensitivity: "base",
            });

      return sort.direction === "asc" ? result : -result;
    });
  }, [tickets, query, drafts, status, type, priority, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visible = filtered.slice(startIndex, startIndex + pageSize);
  const start = filtered.length ? startIndex + 1 : 0;
  const end = Math.min(startIndex + pageSize, filtered.length);

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction:
        current?.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  }

  function clearFilters() {
    setStatus("All");
    setType("All");
    setPriority("All");
    setQuery("");
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        {!drafts ? (
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
          </div>
        ) : (
          <div />
        )}

        <label className="relative ml-auto w-full xl:w-64">
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
            placeholder={drafts ? "Search ticket drafts..." : "Search tickets..."}
          />
        </label>
      </div>

      {!drafts && filtersOpen ? (
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
                setStatus(value as "All" | ClientTicketStatus);
                setPage(1);
              }}
            />

            <TagDropdown
              label="Priority Type"
              value={priority}
              options={priorities.map((item) => ({
                value: item,
                label: item,
                color: priorityColors[item],
                description:
                  ticketPriorityDescriptions[item] ??
                  "Priority assigned by the support team",
              }))}
              onChange={(value) => {
                setPriority(value as "All" | ClientTicketPriority);
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
                description:
                  ticketTypeDescriptions[item] ?? "Ticket request type",
              }))}
              onChange={(value) => {
                setType(value as "All" | ClientTicketType);
                setPage(1);
              }}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={
                status === "All" && type === "All" && priority === "All"
              }
              onClick={clearFilters}
              className="self-end rounded-lg border border-red-500 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-transparent"
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : null}

      <div className="ticket-table-frame">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <table className="w-full min-w-[1380px] table-fixed text-left">
            <thead>
              <tr>
                <th className="w-24 text-center">Priority</th>

                <th className="w-[220px]">
                  <SortButton
                    label="Ticket Title"
                    sortKey="title"
                    sort={sort}
                    onSort={toggleSort}
                  />
                </th>

                <th className="w-[155px] text-center">
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
                    sortKey="reporter"
                    sort={sort}
                    onSort={toggleSort}
                  />
                </th>

                <th className="w-[175px]">
                  <SortButton
                    label="Resource Assigned"
                    sortKey="assignee"
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

                <th className="w-20 text-center" />
              </tr>
            </thead>

            <tbody>
              {visible.map((ticket, index) => {
                const href = drafts
                  ? `/client-portal/tickets/new?draft=${encodeURIComponent(ticket.id)}`
                  : `/client-portal/tickets/${encodeURIComponent(ticket.id)}`;

                return (
                  <tr
                    key={ticket.id}
                    className={cn(index % 2 && "bg-gray-50/50")}
                  >
                    <td className="text-center">
                      <div className="flex flex-col items-center">
                        <strong className="text-sm font-medium text-gray-900">
                          {priorityNumber[ticket.priority] || "—"}
                        </strong>
                      </div>
                    </td>

                    <td>
                      <div className="ticket-title-wrap">
                        <Link
                          href={href}
                          title={ticket.title}
                          className="block truncate font-semibold text-slate-900 hover:text-[#0284C7]"
                        >
                          {ticket.title || "Untitled ticket"}
                        </Link>
                        <span className="mt-1 block truncate text-xs text-slate-400">
                          {ticket.id} · {ticket.type}
                        </span>
                      </div>
                    </td>

                    <td className="text-center">
                      <span
                        className={cn(
                          "ticket-pill",
                          priorityColors[ticket.priority],
                        )}
                      >
                        {ticket.priority}
                      </span>
                    </td>

                    <td>
                      <span className="block truncate text-sm text-gray-900">
                        {ticket.project || "Not set"}
                      </span>
                    </td>

                    <td>
                      <PersonCell name={ticket.reporter} />
                    </td>

                    <td>
                      <PersonCell name={ticket.assignee || "Unassigned"} />
                    </td>

                    <td>{formatDate(ticket.createdAt)}</td>

                    <td>
                      <span className="block">{formatDate(ticket.dueDate)}</span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {timeRemainingLabel(ticket.dueDate)}
                      </span>
                    </td>

                    <td className="text-center">
                      <span
                        className={cn(
                          "ticket-pill",
                          drafts
                            ? "bg-slate-500 text-white ring-1 ring-slate-600"
                            : statusColors[ticket.status],
                        )}
                      >
                        {drafts ? "Draft" : ticket.status}
                      </span>
                    </td>

                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={href}
                          className="row-icon hover:!bg-transparent hover:text-[#0284C7]"
                          title={drafts ? "Continue draft" : "Open ticket"}
                          aria-label={drafts ? "Continue draft" : "Open ticket"}
                        >
                          {drafts ? <Edit3 /> : <ArrowRight />}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!visible.length ? (
            <div className="py-20 text-center text-slate-500">
              {drafts
                ? "No ticket drafts match your search."
                : "No tickets match your search and filters."}
            </div>
          ) : null}

          <footer className="flex items-center justify-center gap-4 border-t border-slate-200 px-5 py-4 text-sm text-slate-500">
            <span>
              {start} - {end} of {filtered.length.toLocaleString()}
            </span>

            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2"
              aria-label="Rows per page"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>

            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="row-icon disabled:opacity-50"
              aria-label="Previous page"
            >
              <ChevronDown className="rotate-90" />
            </button>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
              className="row-icon disabled:opacity-50"
              aria-label="Next page"
            >
              <ChevronDown className="-rotate-90" />
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
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

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-20 cursor-default"
            aria-label={`Close ${label} dropdown`}
            onClick={() => setOpen(false)}
          />

          <div className="absolute z-30 mt-1 grid max-h-72 w-full min-w-[430px] gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
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
                  <span className="whitespace-nowrap text-sm text-slate-500">
                    {option.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function PersonCell({ name }: { name: string }) {
  const value = name.trim();

  if (!value || value === "Unassigned") {
    return <span className="text-sm text-gray-400">{value || "Not set"}</span>;
  }

  const initials = value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="flex items-center gap-2">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#0284C7]/10 text-[9px] font-semibold text-[#0284C7]">
        {initials}
      </span>
      <span className="truncate text-sm text-gray-900">{value}</span>
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
  sort?: SortState;
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

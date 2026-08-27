"use client";

import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FilePenLine,
  Filter,
  History,
  Search,
  Undo2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { usePageSearch } from "@/components/providers/PageSearchProvider";
import type {
  ResourcePortalTicket,
  ResourceTicketPriority,
  ResourceTicketStatus,
  ResourceTicketType,
} from "@/types/resourcePortal";

const pageSizes = [10, 25, 50];

const priorityRank: Record<ResourceTicketPriority, number> = {
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4,
  "Not Assigned": 5,
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

function statusSlug(status: ResourceTicketStatus) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function prioritySlug(priority: ResourceTicketPriority) {
  return priority.toLowerCase().replaceAll(" ", "-");
}

function initials(name: string) {
  const value = name.trim();
  if (!value) return "—";
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function ResourceTicketList({
  tickets,
  drafts = false,
  currentUserId,
}: {
  tickets: ResourcePortalTicket[];
  drafts?: boolean;
  currentUserId: number;
}) {
  const { query, setQuery } = usePageSearch();
  const [rows, setRows] = useState(tickets);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [renameId, setRenameId] = useState<string>();
  const [renameValue, setRenameValue] = useState("");
  const [renameConfirmationOpen, setRenameConfirmationOpen] = useState(false);
  const [historyId, setHistoryId] = useState<string>();
  const [toast, setToast] = useState("");
  const [status, setStatus] = useState<"All" | ResourceTicketStatus>("All");
  const [type, setType] = useState<"All" | ResourceTicketType>("All");
  const [priority, setPriority] = useState<"All" | ResourceTicketPriority>("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<SortState>();

  const statuses = useMemo(
    () => Array.from(new Set(rows.map((ticket) => ticket.status))),
    [tickets],
  );
  const types = useMemo(
    () => Array.from(new Set(rows.map((ticket) => ticket.type))),
    [tickets],
  );
  const priorities = useMemo(
    () => Array.from(new Set(rows.map((ticket) => ticket.priority))),
    [tickets],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const filteredRows = rows.filter((ticket) => {
      const matchesSearch =
        !normalized ||
        `${ticket.id} ${ticket.title} ${ticket.project} ${ticket.assignee} ${ticket.reporter} ${ticket.type}`
          .toLowerCase()
          .includes(normalized);

      return (
        matchesSearch &&
        (status === "All" || ticket.status === status) &&
        (type === "All" || ticket.type === type) &&
        (priority === "All" || ticket.priority === priority)
      );
    });

    if (!sort) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      let aValue: string | number = a[sort.key] ?? "";
      let bValue: string | number = b[sort.key] ?? "";

      if (sort.key === "priority") {
        aValue = priorityRank[a.priority] ?? 99;
        bValue = priorityRank[b.priority] ?? 99;
      }

      if (sort.key === "createdAt" || sort.key === "dueDate") {
        const aTime = new Date(String(aValue)).getTime();
        const bTime = new Date(String(bValue)).getTime();
        aValue = Number.isNaN(aTime) ? 0 : aTime;
        bValue = Number.isNaN(bTime) ? 0 : bTime;
      }

      const result =
        typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue), undefined, {
              numeric: true,
              sensitivity: "base",
            });

      return sort.direction === "asc" ? result : -result;
    });
  }, [rows, query, status, type, priority, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const startIndex = (currentPage - 1) * pageSize;
  const visible = filtered.slice(startIndex, startIndex + pageSize);
  const start = filtered.length ? startIndex + 1 : 0;
  const end = Math.min(startIndex + pageSize, filtered.length);

  function updateFilter(callback: () => void) {
    callback();
    setPage(1);
  }

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

  async function patchTicket(id: string, body: Record<string, unknown>) {
    const response = await fetch(`/api/resource-portal/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error || "Unable to update ticket.");
    return payload as ResourcePortalTicket;
  }

  function requestRename(id: string, title: string) {
    setRenameId(id);
    setRenameValue(title);
    setRenameConfirmationOpen(false);
  }

  async function confirmRename() {
    const id = renameId;
    const value = renameValue.trim();
    const row = rows.find((ticket) => ticket.id === id);
    if (!id || !row || !value) return;
    try {
      const updated = await patchTicket(id, { action: "rename", title: value });
      setRows((current) => current.map((ticket) => (ticket.id === id ? updated : ticket)));
      setRenameId(undefined);
      setRenameValue("");
      setRenameConfirmationOpen(false);
      setToast("Ticket name updated successfully");
      window.setTimeout(() => setToast(""), 2200);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to update ticket.");
    }
  }

  async function undoRename(id: string) {
    try {
      const updated = await patchTicket(id, { action: "undoTitle" });
      setRows((current) => current.map((ticket) => (ticket.id === id ? updated : ticket)));
      setToast("Previous ticket name restored");
      window.setTimeout(() => setToast(""), 2200);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to update ticket.");
    }
  }

  return (
    <>
      <section className="resource-admin-ticket-list">
        <div className="resource-admin-ticket-toolbar">
          {!drafts ? (
            <div className="resource-admin-ticket-tools">
              <button
                type="button"
                className={
                  filtersOpen
                    ? "resource-admin-ticket-tool-button is-active"
                    : "resource-admin-ticket-tool-button"
                }
                onClick={() => setFiltersOpen((current) => !current)}
              >
                <Filter size={18} />
                Filters
              </button>
            </div>
          ) : (
            <div />
          )}

          <label className="resource-admin-ticket-search">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={drafts ? "Search ticket drafts..." : "Search tickets..."}
              aria-label={drafts ? "Search ticket drafts" : "Search tickets"}
            />
          </label>
        </div>

        {!drafts && filtersOpen ? (
          <div className="resource-admin-ticket-filter-panel">
            <FilterField label="Status">
              <select
                value={status}
                onChange={(event) =>
                  updateFilter(() =>
                    setStatus(event.target.value as "All" | ResourceTicketStatus),
                  )
                }
              >
                <option value="All">All statuses</option>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Priority Type">
              <select
                value={priority}
                onChange={(event) =>
                  updateFilter(() =>
                    setPriority(
                      event.target.value as "All" | ResourceTicketPriority,
                    ),
                  )
                }
              >
                <option value="All">All priorities</option>
                {priorities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Ticket Type">
              <select
                value={type}
                onChange={(event) =>
                  updateFilter(() =>
                    setType(event.target.value as "All" | ResourceTicketType),
                  )
                }
              >
                <option value="All">All ticket types</option>
                {types.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </FilterField>

            <button
              type="button"
              className="resource-admin-ticket-clear-filters"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        ) : null}

        <div className="resource-admin-ticket-table-frame">
          <div className="resource-admin-ticket-table-scroll">
            <table className="resource-admin-ticket-table">
              <thead>
                <tr>
                  <th className="resource-admin-ticket-title-column">
                    <SortButton
                      label="Ticket"
                      sortKey="title"
                      sort={sort}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <SortButton
                      label="Priority"
                      sortKey="priority"
                      sort={sort}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <SortButton
                      label="Project"
                      sortKey="project"
                      sort={sort}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <SortButton
                      label="Created By"
                      sortKey="reporter"
                      sort={sort}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <SortButton
                      label="Assigned To"
                      sortKey="assignee"
                      sort={sort}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <SortButton
                      label="Created"
                      sortKey="createdAt"
                      sort={sort}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <SortButton
                      label="Deadline"
                      sortKey="dueDate"
                      sort={sort}
                      onSort={toggleSort}
                    />
                  </th>
                  <th>
                    <SortButton
                      label="Status"
                      sortKey="status"
                      sort={sort}
                      onSort={toggleSort}
                      centered
                    />
                  </th>
                  <th className="resource-admin-ticket-action-column" />
                </tr>
              </thead>

              <tbody>
                {visible.map((ticket, index) => {
                  const href = drafts
                    ? `/resource-portal/tickets/new?draft=${encodeURIComponent(ticket.id)}`
                    : `/resource-portal/tickets/${encodeURIComponent(ticket.id)}`;

                  const canRename = !drafts && ticket.createdById != null && ticket.createdById === currentUserId;

                  return (
                    <tr key={ticket.id} className={index % 2 ? "is-striped" : ""}>
                      <td>
                        <div className="resource-admin-ticket-title-wrap resource-admin-ticket-title-group">
                          <div className="resource-admin-ticket-title-main">
                            <Link href={href} title={ticket.title}>
                              {ticket.title || "Untitled ticket"}
                            </Link>
                            <span>
                              {ticket.id} · {ticket.type}
                            </span>
                          </div>
                          {canRename ? (
                            <div className="resource-admin-ticket-title-actions">
                              <button type="button" className="resource-admin-ticket-row-icon" title="Rename ticket" onClick={() => requestRename(ticket.id, ticket.title)}><FilePenLine size={16} /></button>
                              <button type="button" className="resource-admin-ticket-row-icon" title="View title history" onClick={() => setHistoryId(ticket.id)}><History size={16} /></button>
                              <button type="button" disabled={!ticket.titleHistory.length} className="resource-admin-ticket-row-icon" title="Undo title change" onClick={() => void undoRename(ticket.id)}><Undo2 size={16} /></button>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`resource-admin-ticket-pill resource-admin-ticket-priority-${prioritySlug(
                            ticket.priority,
                          )}`}
                        >
                          {ticket.priority}
                        </span>
                      </td>

                      <td>
                        <ProjectCell name={ticket.project} />
                      </td>

                      <td>
                        <PersonCell name={ticket.reporter || "—"} />
                      </td>

                      <td>
                        <PersonCell name={ticket.assignee || "Unassigned"} />
                      </td>

                      <td>{formatDate(ticket.createdAt)}</td>

                      <td>
                        <span>{formatDate(ticket.dueDate)}</span>
                        <small className="resource-admin-ticket-deadline-copy">
                          {timeRemainingLabel(ticket.dueDate)}
                        </small>
                      </td>

                      <td className="resource-admin-ticket-status-cell">
                        <span
                          className={`resource-admin-ticket-pill resource-admin-ticket-status-${
                            drafts ? "draft" : statusSlug(ticket.status)
                          }`}
                        >
                          {drafts ? "Draft" : ticket.status}
                        </span>
                      </td>

                      <td>
                        <div className="resource-admin-ticket-row-actions">
                          <Link
                            href={href}
                            className="resource-admin-ticket-row-icon"
                            title={drafts ? "Continue draft" : "Open ticket"}
                            aria-label={drafts ? "Continue draft" : "Open ticket"}
                          >
                            {drafts ? (
                              <FilePenLine size={19} />
                            ) : (
                              <ArrowRight size={19} />
                            )}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!visible.length ? (
              <div className="resource-admin-ticket-empty">
                {drafts
                  ? "No ticket drafts match your search."
                  : "No tickets match your search and filters."}
              </div>
            ) : null}
          </div>

          <footer className="resource-admin-ticket-pagination">
            <span>
              {start} - {end} of {filtered.length.toLocaleString()}
            </span>

            <label className="resource-admin-ticket-page-size">
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
              >
                {pageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
              <ChevronDown size={17} />
            </label>

            <button
              type="button"
              className="resource-admin-ticket-page-button"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={19} />
            </button>

            <button
              type="button"
              className="resource-admin-ticket-page-button"
              disabled={currentPage >= pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              aria-label="Next page"
            >
              <ChevronRight size={19} />
            </button>
          </footer>
        </div>
      </section>

      {renameId && !renameConfirmationOpen ? (
        <div className="modal-backdrop">
          <div role="dialog" aria-modal="true" className="ticket-modal !w-[675px]">
            <h2 className="text-[1.65rem] font-bold text-slate-700">Rename</h2>
            <div className="mt-5">
              <span className="mb-2 block text-base font-semibold text-slate-700">Previous Title</span>
              <div className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm">
                {rows.find((ticket) => ticket.id === renameId)?.title}
              </div>
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-base font-semibold text-slate-700">New Title</span>
              <input autoFocus maxLength={255} className="field !min-h-14 !px-4 !text-base" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => event.key === "Enter" && setRenameConfirmationOpen(true)} placeholder="Write new title" />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-xl border border-cyan-500 px-5 py-3 text-sm font-bold text-[#0284C7] hover:bg-[#E6F8FB]" onClick={() => { setRenameId(undefined); setRenameValue(""); }}>Cancel</button>
              <button className="button-primary !px-6 !py-3" onClick={() => setRenameConfirmationOpen(true)}>Rename</button>
            </div>
          </div>
        </div>
      ) : null}

      {renameId && renameConfirmationOpen ? (
        <div className="modal-backdrop">
          <div role="alertdialog" aria-modal="true" className="ticket-modal !w-[390px] !p-5">
            <h2 className="text-[1.65rem] font-bold text-slate-700">Confirmation</h2>
            <p className="mt-5 text-base font-semibold text-slate-700">Do you want to rename the title?</p>
            <div className="mt-5 flex items-center justify-between">
              <button className="rounded-xl border border-cyan-500 px-7 py-3 text-sm font-bold text-[#0284C7] hover:bg-[#E6F8FB]" onClick={() => setRenameConfirmationOpen(false)}>No</button>
              <button className="button-primary !px-7 !py-3" onClick={() => void confirmRename()}>Yes</button>
            </div>
          </div>
        </div>
      ) : null}

      {historyId ? (
        <div className="modal-backdrop">
          <div role="dialog" aria-modal="true" className="ticket-modal">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Previous Ticket Names</h2>
              <button type="button" onClick={() => setHistoryId(undefined)}><X /></button>
            </div>
            <div className="mt-5 space-y-2">
              {rows.find((item) => item.id === historyId)?.titleHistory.map((name, index) => (
                <div key={`${name}-${index}`} className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                  <Clock3 size={16} className="text-sky-600" />
                  {name}
                </div>
              ))}
              {!rows.find((item) => item.id === historyId)?.titleHistory.length ? (
                <p className="text-sm text-slate-500">No previous name changes.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div role="status" className="ticket-toast ticket-toast-success">
          <p className="text-sm">{toast}</p>
          <button className="ml-auto" aria-label="Dismiss notification" onClick={() => setToast("")}><X size={17} /></button>
        </div>
      ) : null}

      <TicketListStyles />
    </>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="resource-admin-ticket-filter-field">
      <span>{label}</span>
      {children}
    </label>
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
  const active = sort?.key === sortKey;
  return (
    <button
      type="button"
      className={
        centered
          ? "resource-admin-ticket-sort is-centered"
          : "resource-admin-ticket-sort"
      }
      onClick={() => onSort(sortKey)}
    >
      <span>{label}</span>
      <ChevronDown
        size={14}
        className={
          active && sort.direction === "asc"
            ? "is-asc"
            : active
              ? "is-desc"
              : ""
        }
      />
    </button>
  );
}

function ProjectCell({ name }: { name: string }) {
  return (
    <span className="resource-admin-ticket-project-cell">
      <span className="resource-admin-ticket-project-avatar">
        {name.trim().charAt(0).toUpperCase() || "P"}
      </span>
      <span title={name}>{name || "—"}</span>
    </span>
  );
}

function PersonCell({ name }: { name: string }) {
  return (
    <span className="resource-admin-ticket-person-cell">
      <span className="resource-admin-ticket-person-avatar">{initials(name)}</span>
      <span title={name}>{name}</span>
    </span>
  );
}

function TicketListStyles() {
  return (
    <style>{`
      .resource-admin-ticket-list {
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
        min-width: 0;
        color: #475569;
        font-family: Geist, var(--font-inter), Inter, Arial, sans-serif;
      }

      .resource-admin-ticket-toolbar {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .resource-admin-ticket-tools {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .resource-admin-ticket-tool-button {
        display: inline-flex;
        min-height: 48px;
        align-items: center;
        justify-content: center;
        gap: 9px;
        border: 1px solid #cbd5e1;
        border-radius: 9px;
        background: #ffffff;
        padding: 10px 18px;
        color: #334155;
        font-size: 14px;
        font-weight: 700;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
        cursor: pointer;
      }

      .resource-admin-ticket-tool-button:hover,
      .resource-admin-ticket-tool-button.is-active {
        border-color: #0ea5e9;
        color: #0369a1;
      }

      .resource-admin-ticket-search {
        position: relative;
        width: 100%;
        margin-left: auto;
        color: #94a3b8;
      }

      .resource-admin-ticket-search > svg {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
      }

      .resource-admin-ticket-search input {
        width: 100%;
        height: 40px;
        border: 1px solid #d1d5db;
        border-radius: 12px;
        background: #ffffff;
        padding: 0 16px 0 40px;
        color: #111827;
        font: inherit;
        font-size: 14px;
        outline: none;
      }

      .resource-admin-ticket-search input:focus {
        border-color: transparent;
        box-shadow: 0 0 0 2px #0284c7;
      }

      .resource-admin-ticket-filter-panel {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
        gap: 12px;
        align-items: end;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: #f8fafc;
        padding: 16px;
      }

      .resource-admin-ticket-filter-field {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 7px;
      }

      .resource-admin-ticket-filter-field > span {
        color: #334155;
        font-size: 13px;
        font-weight: 700;
      }

      .resource-admin-ticket-filter-field select {
        width: 100%;
        min-height: 44px;
        border: 1px solid #d8dee7;
        border-radius: 8px;
        background: #ffffff;
        padding: 0 12px;
        color: #0f172a;
        font: inherit;
        font-size: 14px;
        outline: none;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
      }

      .resource-admin-ticket-filter-field select:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
      }

      .resource-admin-ticket-clear-filters {
        min-height: 44px;
        border: 1px solid #cbd5e1;
        border-radius: 9px;
        background: #ffffff;
        padding: 0 16px;
        color: #334155;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }

      .resource-admin-ticket-clear-filters:hover {
        background: #f1f5f9;
        color: #0284c7;
      }

      .resource-admin-ticket-table-frame {
        display: flex;
        min-width: 0;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid #e2e8f0;
        border-radius: 11px;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
      }

      .resource-admin-ticket-table-scroll {
        min-width: 0;
        overflow-x: auto;
      }

      .resource-admin-ticket-table {
        width: 100%;
        min-width: 1380px;
        table-layout: fixed;
        border-collapse: collapse;
        text-align: left;
      }

      .resource-admin-ticket-table thead {
        height: 61px;
        border-bottom: 1px solid #cbd5e1;
        background: #f8fafc;
        color: #475569;
      }

      .resource-admin-ticket-table th {
        padding: 12px 11px;
        font-size: 11.5px;
        font-weight: 700;
      }

      .resource-admin-ticket-table th:nth-child(1) { width: 260px; }
      .resource-admin-ticket-table th:nth-child(2) { width: 145px; }
      .resource-admin-ticket-table th:nth-child(3) { width: 180px; }
      .resource-admin-ticket-table th:nth-child(4) { width: 170px; }
      .resource-admin-ticket-table th:nth-child(5) { width: 170px; }
      .resource-admin-ticket-table th:nth-child(6) { width: 130px; }
      .resource-admin-ticket-table th:nth-child(7) { width: 175px; }
      .resource-admin-ticket-table th:nth-child(8) { width: 145px; }
      .resource-admin-ticket-table th:nth-child(9) { width: 72px; }

      .resource-admin-ticket-table td {
        height: 99px;
        padding: 16px 11px;
        border-top: 1px solid #f1f5f9;
        color: #475569;
        font-size: 13.5px;
        vertical-align: middle;
      }

      .resource-admin-ticket-table tbody tr:first-child td {
        border-top: 0;
      }

      .resource-admin-ticket-table tbody tr.is-striped {
        background: rgba(249, 250, 251, 0.7);
      }

      .resource-admin-ticket-table tbody tr:hover {
        background: #f8fdff;
      }

      .resource-admin-ticket-sort {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }

      .resource-admin-ticket-sort.is-centered {
        width: 100%;
        justify-content: center;
      }

      .resource-admin-ticket-sort svg {
        opacity: 0.45;
        transition: transform 0.15s ease, opacity 0.15s ease;
      }

      .resource-admin-ticket-sort svg.is-asc {
        transform: rotate(180deg);
        opacity: 1;
        color: #0284c7;
      }

      .resource-admin-ticket-sort svg.is-desc {
        opacity: 1;
        color: #0284c7;
      }

      .resource-admin-ticket-title-wrap {
        min-width: 0;
      }

      .resource-admin-ticket-title-group {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }

      .resource-admin-ticket-title-main {
        min-width: 0;
        flex: 1 1 auto;
      }

      .resource-admin-ticket-title-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.15s ease;
      }

      .resource-admin-ticket-table tbody tr:hover .resource-admin-ticket-title-actions {
        opacity: 1;
      }

      .resource-admin-ticket-title-wrap > a {
        display: block;
        overflow: hidden;
        color: #0f172a;
        font-weight: 600;
        text-decoration: none;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .resource-admin-ticket-title-wrap > a:hover {
        color: #0284c7;
      }

      .resource-admin-ticket-title-wrap > span {
        display: block;
        margin-top: 5px;
        overflow: hidden;
        color: #94a3b8;
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .resource-admin-ticket-pill {
        display: inline-flex;
        min-width: 120px;
        justify-content: center;
        border: 1px solid transparent;
        border-radius: 9999px;
        padding: 5px 12px;
        font-size: 12px;
        line-height: 1.1;
        white-space: nowrap;
      }

      .resource-admin-ticket-priority-critical {
        border-color: #b91c1c;
        background: #dc2626;
        color: #ffffff;
      }

      .resource-admin-ticket-priority-high {
        border-color: #c2410c;
        background: #ea580c;
        color: #ffffff;
      }

      .resource-admin-ticket-priority-medium {
        border-color: #a16207;
        background: #ca8a04;
        color: #ffffff;
      }

      .resource-admin-ticket-priority-low {
        border-color: #15803d;
        background: #16a34a;
        color: #ffffff;
      }

      .resource-admin-ticket-priority-not-assigned {
        border-color: #6b7280;
        background: #9ca3af;
        color: #ffffff;
      }

      .resource-admin-ticket-status-open {
        border-color: #6d28d9;
        background: #7c3aed;
        color: #ffffff;
      }

      .resource-admin-ticket-status-reviewed {
        border-color: #1e293b;
        background: #334155;
        color: #ffffff;
      }

      .resource-admin-ticket-status-assigned,
      .resource-admin-ticket-status-validation {
        border-color: #1d4ed8;
        background: #2563eb;
        color: #ffffff;
      }

      .resource-admin-ticket-status-active {
        border-color: #0f766e;
        background: #0d9488;
        color: #ffffff;
      }

      .resource-admin-ticket-status-blocked {
        border-color: #c2410c;
        background: #ea580c;
        color: #ffffff;
      }

      .resource-admin-ticket-status-awaiting {
        border-color: #be185d;
        background: #db2777;
        color: #ffffff;
      }

      .resource-admin-ticket-status-qa,
      .resource-admin-ticket-status-resolved {
        border-color: #15803d;
        background: #16a34a;
        color: #ffffff;
      }

      .resource-admin-ticket-status-closed {
        border-color: #374151;
        background: #4b5563;
        color: #ffffff;
      }

      .resource-admin-ticket-status-reopened {
        border-color: #b91c1c;
        background: #dc2626;
        color: #ffffff;
      }

      .resource-admin-ticket-status-cancelled,
      .resource-admin-ticket-status-draft {
        border-color: #6b7280;
        background: #9ca3af;
        color: #ffffff;
      }

      .resource-admin-ticket-project-cell,
      .resource-admin-ticket-person-cell {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 8px;
      }

      .resource-admin-ticket-project-cell > span:last-child,
      .resource-admin-ticket-person-cell > span:last-child {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .resource-admin-ticket-project-avatar,
      .resource-admin-ticket-person-avatar {
        display: grid;
        width: 28px;
        height: 28px;
        flex: 0 0 28px;
        place-items: center;
        border-radius: 9999px;
        background: #e5e7eb;
        color: #4b5563;
        font-size: 10px;
        font-weight: 700;
      }

      .resource-admin-ticket-person-avatar {
        background: #e6f8fb;
        color: #0284c7;
      }

      .resource-admin-ticket-deadline-copy {
        display: block;
        margin-top: 4px;
        color: #64748b;
        font-size: 11px;
      }

      .resource-admin-ticket-status-cell {
        text-align: center;
      }

      .resource-admin-ticket-row-actions {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .resource-admin-ticket-row-icon {
        display: grid;
        width: 34px;
        height: 34px;
        place-items: center;
        border-radius: 7px;
        color: #475569;
        text-decoration: none;
      }

      .resource-admin-ticket-row-icon:hover {
        color: #0284c7;
      }

      .resource-admin-ticket-empty {
        padding: 80px 24px;
        text-align: center;
        color: #64748b;
        font-size: 14px;
      }

      .resource-admin-ticket-pagination {
        display: flex;
        min-height: 68px;
        align-items: center;
        justify-content: center;
        gap: 16px;
        border-top: 1px solid #e2e8f0;
        background: #ffffff;
        padding: 16px 20px;
        color: #64748b;
        font-size: 14px;
      }

      .resource-admin-ticket-page-size {
        position: relative;
        display: inline-flex;
        align-items: center;
      }

      .resource-admin-ticket-page-size select {
        min-height: 38px;
        appearance: none;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #ffffff;
        padding: 0 38px 0 16px;
        color: #334155;
        font: inherit;
      }

      .resource-admin-ticket-page-size svg {
        position: absolute;
        right: 12px;
        pointer-events: none;
      }

      .resource-admin-ticket-page-button {
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

      .resource-admin-ticket-page-button:hover:not(:disabled) {
        background: #e6f8fb;
        color: #0284c7;
      }

      .resource-admin-ticket-page-button:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }

      @media (min-width: 1280px) {
        .resource-admin-ticket-toolbar {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }

        .resource-admin-ticket-search {
          width: 256px;
        }
      }

      @media (max-width: 980px) {
        .resource-admin-ticket-filter-panel {
          grid-template-columns: 1fr 1fr;
        }

        .resource-admin-ticket-clear-filters {
          grid-column: 1 / -1;
        }
      }

      @media (max-width: 640px) {
        .resource-admin-ticket-filter-panel {
          grid-template-columns: 1fr;
        }

        .resource-admin-ticket-pagination {
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 10px;
        }
      }
    `}</style>
  );
}
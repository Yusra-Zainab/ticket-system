"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CheckCircle,
  ChevronDown,
  Clock3,
  Edit3,
  FilePenLine,
  Filter,
  FolderOpen,
  Grip,
  History,
  Search,
  Trash2,
  Undo2,
  X,
  XCircle,
} from "lucide-react";
import { mockTickets } from "@/data/mockData";
import { cn, formatDate } from "@/lib/utils";
import type { Ticket } from "@/types";

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
  Open: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
  Reviewed: "bg-gray-50 text-gray-700 ring-1 ring-gray-600/20",
  Assigned: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20",
  Active: "bg-teal-50 text-teal-700 ring-1 ring-teal-600/20",
  Blocked: "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20",
  Awaiting: "bg-pink-50 text-pink-700 ring-1 ring-pink-600/20",
  QA: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
  Validation: "bg-blue-600 text-white ring-1 ring-blue-700",
  Resolved: "bg-green-600 text-white ring-1 ring-green-700",
  Closed: "bg-gray-700 text-white ring-1 ring-gray-800",
  Reopened: "bg-red-600 text-white ring-1 ring-red-700",
  Cancelled: "bg-gray-400 text-white ring-1 ring-gray-500",
};
const priorityColors = {
  1: "bg-red-600 text-white ring-1 ring-red-700",
  2: "bg-orange-600 text-white ring-1 ring-orange-700",
  3: "bg-yellow-600 text-white ring-1 ring-yellow-700",
  4: "bg-green-600 text-white ring-1 ring-green-700",
  5: "bg-gray-400 text-white ring-1 ring-gray-500",
} as const;
const initialRows: TicketRow[] = mockTickets.map((ticket, index) => ({
  ...ticket,
  status: (["Closed", "Reviewed", "Assigned", "Blocked", "Active", "QA"][
    index
  ] ?? "Open") as TicketStatus,
  priority: Math.min(ticket.priority, 4) as Priority,
  priorityNumber: index + 1,
  type: ([
    "Bug",
    "Support Request",
    "UI/UX Issue",
    "Task",
    "Change Request",
    "Technical Issue",
  ][index] ?? "Task") as TicketType,
  createdBy:
    [
      "Customer Owner",
      "Coordinator",
      "Admin",
      "Customer Support",
      "Admin",
      "QA Team",
    ][index] ?? "Admin",
  history: [],
}));

export default function TicketsTable() {
  const [tickets, setTickets] = useState(initialRows);
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
  const toggleSort = (key: SortKey) =>
    setSort((current) => ({
      key,
      direction:
        current?.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  const applySelected = (patch: Partial<TicketRow>, message: string) => {
    if (!selected.length)
      return notify("error", "Select at least one ticket first");
    setTickets((rows) =>
      rows.map((row) =>
        selected.includes(row.id) ? { ...row, ...patch } : row,
      ),
    );
    setSelected([]);
    setBulkDialog(undefined);
    notify("success", message);
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
    notify("success", "Ticket has been deleted");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-3">
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
        </div>
        <label className="relative w-full xl:w-64">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 w-full rounded-full border border-gray-300 bg-white pl-10 pr-4 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-[#0284C7]"
            placeholder="Search tickets..."
          />
        </label>
      </div>
      {filtersOpen && (
        <div className="grid gap-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 sm:grid-cols-4">
          <FilterSelect
            label="Status"
            value={status}
            onChange={(value) => setStatus(value as typeof status)}
            options={statuses}
          />
          <FilterSelect
            label="Ticket Type"
            value={type}
            onChange={(value) => setType(value as typeof type)}
            options={ticketTypes}
          />
          <FilterSelect
            label="Priority"
            value={String(priority)}
            onChange={(value) =>
              setPriority(value === "All" ? "All" : (Number(value) as Priority))
            }
            options={priorities.map((item) => String(item.value))}
          />
          <button
            onClick={() => {
              setStatus("All");
              setType("All");
              setPriority("All");
              setQuery("");
            }}
            className="button-secondary self-end"
          >
            Clear filters
          </button>
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
                            <button
                              title="Rename ticket"
                              onClick={() => {
                                setRenameId(ticket.id);
                                setRenameValue("");
                              }}
                            >
                              <FilePenLine size={17} />
                            </button>
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
                        1 day remaining
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
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="row-icon"
                          title="Ticket files"
                        >
                          <FolderOpen />
                        </Link>
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="row-icon"
                          title="Write or edit ticket"
                        >
                          <Edit3 />
                        </Link>
                        <button
                          onClick={() => setDeleteId(ticket.id)}
                          className="row-icon text-red-500 hover:bg-red-100"
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
          <footer className="flex items-center justify-end gap-4 border-t border-slate-200 px-5 py-4 text-sm text-slate-500">
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

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <select
        className="field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option>All</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function PersonCell({ name }: { name: string }) {
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

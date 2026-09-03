"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Trash2,
  X,
} from "lucide-react";
import ClientStatusBadge from "@/components/features/ClientStatusBadge";
import { type ReactNode, useMemo, useState } from "react";

import { usePageSearch } from "@/components/providers/PageSearchProvider";
import { Avatar } from "@/components/ui/Avatar";
import { SortArrows } from "@/components/ui/SortArrows";
import { clientStatusDescriptions } from "@/lib/statusOptions";
import { cn } from "@/lib/utils";

import type {
  ClientListRow,
  ClientListStatus,
  ClientTeamMember,
} from "@/types";

const pageSizes = [10, 20, 50] as const;

const clientStatuses: ClientListStatus[] = [
  "Active",
  "Inactive",
  "Onboarding",
  "Paused",
  "Completed",
];

type SortKey =
  | "clientName"
  | "primaryContact"
  | "contactMethod"
  | "assignedProjects"
  | "openTickets"
  | "status"
  | "lastActivity";

type SortDirection = "asc" | "desc";

type ToastState = {
  kind: "success" | "error";

  message: string;
};

export default function ClientsTable({
  initialClients,
  detailBaseHref = "/clients",
  allowDelete = true,
}: {
  initialClients: ClientListRow[];
  detailBaseHref?: string;
  allowDelete?: boolean;
}) {
  const router = useRouter();

  const { query, setQuery } = usePageSearch();

  /*
   * Keep a local copy so a deleted client
   * disappears immediately without waiting
   * for a complete page refresh.
   */
  const [clients, setClients] = useState<ClientListRow[]>(initialClients);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [contactMethod, setContactMethod] = useState("All");

  const [assignedProject, setAssignedProject] = useState("All");

  const [status, setStatus] = useState<"All" | ClientListStatus>("All");

  const [sort, setSort] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "lastActivity",

    direction: "desc",
  });

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(10);

  /*
   * Client waiting for deletion confirmation.
   */
  const [deleteTarget, setDeleteTarget] = useState<ClientListRow | undefined>();

  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<ToastState | undefined>();

  /* =======================================================
     FILTER OPTIONS
     ======================================================= */

  const contactMethods = useMemo(
    () =>
      Array.from(
        new Set(clients.map((client) => client.contactMethod).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [clients],
  );

  const projects = useMemo(() => {
    const projectMap = new Map<string, string>();

    for (const client of clients) {
      for (const project of client.assignedProjects ?? []) {
        projectMap.set(project.id, project.name);
      }
    }

    return Array.from(projectMap.entries())
      .map(([id, name]) => ({
        id,
        name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  /* =======================================================
     FILTER + SORT
     ======================================================= */

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    const next = clients.filter((client) => {
      const matchesSearch =
        !search ||
        [
          client.clientName,
          client.primaryContact,
          client.contactMethod,

          (client.assignedProjects ?? []).map((project) => project.name).join(" "),

          (client.clientTeam ?? []).map((member) => member.name).join(" "),

          client.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      const matchesContact =
        contactMethod === "All" || client.contactMethod === contactMethod;

      const matchesProject =
        assignedProject === "All" ||
        (client.assignedProjects ?? []).some(
          (project) => project.id === assignedProject,
        );

      const matchesStatus = status === "All" || client.status === status;

      return matchesSearch && matchesContact && matchesProject && matchesStatus;
    });

    return [...next].sort((a, b) => {
      let left: string | number;

      let right: string | number;

      switch (sort.key) {
        case "openTickets":
          left = a.openTickets;

          right = b.openTickets;

          break;

        case "assignedProjects":
          left = (a.assignedProjects ?? []).length;

          right = (b.assignedProjects ?? []).length;

          break;

        case "lastActivity":
          left = new Date(a.lastActivity).getTime() || 0;

          right = new Date(b.lastActivity).getTime() || 0;

          break;

        default:
          left = String(a[sort.key] ?? "");

          right = String(b[sort.key] ?? "");
      }

      const comparison =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), undefined, {
              numeric: true,

              sensitivity: "base",
            });

      return sort.direction === "asc" ? comparison : comparison * -1;
    });
  }, [clients, query, contactMethod, assignedProject, status, sort]);

  /* =======================================================
     PAGINATION
     ======================================================= */

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  /*
   * No setState/useEffect pagination correction.
   * Clamp the page used during rendering.
   */
  const currentPage = Math.min(page, pageCount);

  const pageStart = (currentPage - 1) * pageSize;

  const visibleClients = filtered.slice(pageStart, pageStart + pageSize);

  const firstItem = filtered.length ? pageStart + 1 : 0;

  const lastItem = Math.min(pageStart + pageSize, filtered.length);

  const hasFilters =
    contactMethod !== "All" || assignedProject !== "All" || status !== "All";

  /* =======================================================
     ACTIONS
     ======================================================= */

  function resetPage() {
    setPage(1);
  }

  function clearFilters() {
    setContactMethod("All");

    setAssignedProject("All");

    setStatus("All");

    resetPage();
  }

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,

      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));

    resetPage();
  }

  async function deleteClient() {
    if (!deleteTarget || deleting) {
      return;
    }

    setDeleting(true);

    setToast(undefined);

    try {
      const response = await fetch(
        `/api/clients/${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
        },
      );

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Unable to delete client.",
        );
      }

      setClients((current) =>
        current.filter((client) => client.id !== deleteTarget.id),
      );

      setDeleteTarget(undefined);

      /*
       * If deletion removed the only row
       * on a later page, move rendering
       * back one page.
       */
      if (visibleClients.length === 1 && currentPage > 1) {
        setPage(currentPage - 1);
      }

      setToast({
        kind: "success",

        message: `${deleteTarget.clientName} was deleted successfully.`,
      });

      router.refresh();
    } catch (reason) {
      setToast({
        kind: "error",

        message:
          reason instanceof Error ? reason.message : "Unable to delete client.",
      });
    } finally {
      setDeleting(false);
    }
  }

  /* =======================================================
     UI
     ======================================================= */

  return (
    <div className="space-y-6">
      {/* ==================================================
          TOOLBAR
         ================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/*
         * Simple Filters button.
         * No count badge.
         */}
        <button
          type="button"
          onClick={() => setFiltersOpen((current) => !current)}
          className={cn(
            "inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg border border-[#D0D5DD] bg-white px-[14px] text-[14px] font-semibold text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:bg-[#F9FAFB]",

            filtersOpen,
          )}
        >
          <Filter size={20} />
          Filters
        </button>

        <label className="relative block w-full sm:w-[320px]">
          <Search
            size={20}
            className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-[#667085]"
          />

          <span className="sr-only">Search clients</span>

          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);

              resetPage();
            }}
            placeholder="Search"
            className="h-11 w-full rounded-lg border border-[#D0D5DD] bg-white pl-[42px] pr-4 text-[16px] font-normal text-[#101828] shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none placeholder:text-[#667085] focus:border-[#0284C7] focus:ring-[3px] focus:ring-[#0284C7]/10"
          />
        </label>
      </div>

      {/* ==================================================
          FILTER PANEL
         ================================================== */}

      {filtersOpen && (
        <section className="rounded-xl border border-[#EAECF0] bg-[#F9FAFB] p-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
            <ClientFilterDropdown
              label="Contact Method"
              value={contactMethod}
              options={["All", ...contactMethods]}
              placeholder="All methods"
              searchPlaceholder="Search contact method..."
              onChange={(value) => {
                setContactMethod(value);

                resetPage();
              }}
            />

            <ClientFilterDropdown
              label="Assigned Project"
              value={assignedProject}
              options={[
                {
                  value: "All",

                  label: "All projects",
                },

                ...projects.map((project) => ({
                  value: project.id,

                  label: project.name,
                })),
              ]}
              placeholder="All projects"
              searchPlaceholder="Search project..."
              onChange={(value) => {
                setAssignedProject(value);

                resetPage();
              }}
            />

            <ClientFilterDropdown
              label="Status"
              value={status}
              options={["All", ...clientStatuses]}
              placeholder="All statuses"
              searchPlaceholder="Search status..."
              onChange={(value) => {
                setStatus(value as "All" | ClientListStatus);

                resetPage();
              }}
              renderOption={(value) =>
                value === "All" ? (
                  <span>All statuses</span>
                ) : (
                  <span className="inline-flex min-w-0 items-center gap-3">
                    <ClientStatusBadge
                      status={value as ClientListStatus}
                      className="!min-w-[110px]"
                    />
                    <span className="truncate text-sm text-[#667085]">
                      {
                        clientStatusDescriptions[
                          value as ClientListStatus
                        ]
                      }
                    </span>
                  </span>
                )
              }
            />

            <button
              type="button"
              disabled={!hasFilters}
              onClick={clearFilters}
              className="self-end rounded-lg border border-red-500 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-transparent"
            >
              Clear filters
            </button>
          </div>
        </section>
      )}

      {/* ==================================================
          TABLE
         ================================================== */}

      <div className="overflow-hidden rounded-xl border border-[#EAECF0] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1260px] table-fixed border-collapse">
            <thead className="h-11 bg-[#F9FAFB]">
              <tr>
                <ClientHeader
                  label="Client Name"
                  sortKey="clientName"
                  sort={sort}
                  onSort={toggleSort}
                  className="w-[190px] pl-8 text-left"
                />

                <ClientHeader
                  label="Primary Contact"
                  sortKey="primaryContact"
                  sort={sort}
                  onSort={toggleSort}
                  className="w-[160px]"
                />

                <ClientHeader
                  label="Contact Method"
                  sortKey="contactMethod"
                  sort={sort}
                  onSort={toggleSort}
                  className="w-[150px]"
                />

                <ClientHeader
                  label="Assigned Projects"
                  sortKey="assignedProjects"
                  sort={sort}
                  onSort={toggleSort}
                  className="w-[180px]"
                />

                <ClientHeader
                  label="Open Tickets"
                  sortKey="openTickets"
                  sort={sort}
                  onSort={toggleSort}
                  className="w-[120px]"
                />

                <th className="w-[165px] border-b border-[#EAECF0] px-2 text-center text-[12px] font-semibold leading-[18px] text-[#475467]">
                  Client Team
                </th>

                <ClientHeader
                  label="Status"
                  sortKey="status"
                  sort={sort}
                  onSort={toggleSort}
                  className="w-[130px]"
                />

                <ClientHeader
                  label="Last Activity"
                  sortKey="lastActivity"
                  sort={sort}
                  onSort={toggleSort}
                  className="w-[140px]"
                />

                <th className="w-[68px] border-b border-[#EAECF0]" />
              </tr>
            </thead>

            <tbody>
              {visibleClients.map((client, index) => (
                <tr
                  key={client.id}
                  className={cn(
                    "h-[72px] border-b border-[#EAECF0] last:border-b-0",

                    index % 2 === 1 ? "bg-[#F2F4F7]" : "bg-white",
                  )}
                >
                  {/* Client Name */}
                  <td className="px-6 pl-8 text-left">
                    <Link
                      href={`${detailBaseHref}/${client.id}`}
                      className="text-[14px] font-medium leading-5 text-[#101828] transition hover:text-[#0284C7]"
                    >
                      {client.clientName}
                    </Link>
                  </td>

                  {/* Primary Contact */}
                  <td className="px-2 text-[14px] font-normal leading-5 text-[#475467]">
                    <span className="flex items-center justify-center gap-2">
                      <Avatar
                        name={client.primaryContact}
                        src={client.primaryContactAvatar}
                        className="size-6 text-[9px]"
                      />
                      {client.primaryContact}
                    </span>
                  </td>

                  {/* Contact Method */}
                  <td className="px-2 text-center text-[14px] font-normal leading-5 text-[#475467]">
                    {client.contactMethod}
                  </td>

                  {/* Assigned Projects */}
                  <td className="px-2 text-center">
                    <AssignedProjects projects={client.assignedProjects ?? []} />
                  </td>

                  {/* Open Tickets */}
                  <td className="px-2 text-center text-[14px] font-normal leading-5 text-[#475467]">
                    {client.openTickets}
                  </td>

                  {/* Client Team */}
                  <td className="px-2">
                    <ClientTeam members={client.clientTeam ?? []} />
                  </td>

                  {/* Status */}
                  <td className="px-2 text-center">
                    <ClientStatusBadge status={client.status} />
                  </td>

                  {/* Last Activity */}
                  <td className="px-2 text-center text-[14px] font-normal leading-5 text-[#475467]">
                    {formatActivityDate(client.lastActivity)}
                  </td>

                  {/* Delete */}
                  <td className="px-3 text-center">
                    {allowDelete ? (
                    <button
                      type="button"
                      aria-label={`Delete ${client.clientName}`}
                      title="Delete client"
                      onClick={() => setDeleteTarget(client)}
                      className="mx-auto grid size-9 place-items-center rounded-lg text-[#98A2B3] transition-colors hover:text-red-600"
                    >
                      <Trash2 size={19} />
                    </button>
                    ) : null}
                  </td>
                </tr>
              ))}

              {visibleClients.length === 0 && (
                <tr>
                  <td colSpan={9} className="h-44 text-center">
                    <div className="mx-auto max-w-sm">
                      <p className="text-sm font-semibold text-[#101828]">
                        No clients found
                      </p>

                      <p className="mt-1 text-sm text-[#667085]">
                        Try changing your search or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* =================================================
            PAGINATION
           ================================================= */}

        <footer className="flex min-h-[60px] flex-wrap items-center justify-end gap-3 border-t border-[#EAECF0] bg-white px-6 py-3">
          <span className="text-[12px] font-normal text-[#475467]">
            Showing {firstItem} to {lastItem} of {filtered.length} entries
          </span>

          <div className="relative">
            <select
              aria-label="Clients per page"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));

                setPage(1);
              }}
              className="h-9 appearance-none rounded-lg border border-[#D0D5DD] bg-white pl-4 pr-9 text-[14px] font-semibold text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none"
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>

            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#667085]"
            />
          </div>

          <div className="flex">
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              className="grid size-9 place-items-center rounded-l-lg border border-[#D0D5DD] bg-white text-[#344054] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
              className="-ml-px grid size-9 place-items-center rounded-r-lg border border-[#D0D5DD] bg-white text-[#344054] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </footer>
      </div>

      {/* ==================================================
          DELETE CONFIRMATION
         ================================================== */}

      {deleteTarget && (
        <DeleteClientConfirmation
          client={deleteTarget}
          deleting={deleting}
          onCancel={() => {
            if (deleting) {
              return;
            }

            setDeleteTarget(undefined);
          }}
          onConfirm={() => void deleteClient()}
        />
      )}

      {/* ==================================================
          TOAST
         ================================================== */}

      {toast && (
        <div
          role={toast.kind === "error" ? "alert" : "status"}
          className={cn(
            "ticket-toast",

            toast.kind === "success"
              ? "ticket-toast-success"
              : "ticket-toast-error",
          )}
        >
          <p className="text-sm font-medium">{toast.message}</p>

          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToast(undefined)}
            className="ml-auto"
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   DELETE CONFIRMATION
   Uses the same modal structure used elsewhere in the app.
   ========================================================= */

function DeleteClientConfirmation({
  client,
  deleting,
  onCancel,
  onConfirm,
}: {
  client: ClientListRow;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-client-confirmation-title"
        aria-describedby="delete-client-confirmation-description"
        className="ticket-modal !w-[410px]"
      >
        <h2
          id="delete-client-confirmation-title"
          className="text-2xl font-bold text-slate-700"
        >
          Confirmation
        </h2>

        <p
          id="delete-client-confirmation-description"
          className="mt-5 font-semibold text-slate-700"
        >
          Are you sure you want to delete{" "}
          <span className="font-bold">{client.clientName}</span>?
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          The client will be removed from the clients list. Existing projects
          should remain available and become unassigned from this client.
        </p>

        <div className="mt-6 flex justify-between gap-3">
          <button
            type="button"
            disabled={deleting}
            onClick={onCancel}
            className="button-secondary !border-cyan-500 !text-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            className="min-w-[110px] rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SORT HEADER
   ========================================================= */

function ClientHeader({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;

  sortKey: SortKey;

  sort: {
    key: SortKey;
    direction: SortDirection;
  };

  onSort: (key: SortKey) => void;

  className?: string;
}) {
  const active = sort.key === sortKey;

  return (
    <th className={cn("border-b border-[#EAECF0] px-2 text-center", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 text-[12px] font-semibold leading-[18px] text-[#475467]"
      >
        {label}

        <SortArrows direction={active ? sort.direction : null} size={12} />
      </button>
    </th>
  );
}

/* =========================================================
   ASSIGNED PROJECTS
   ========================================================= */

function AssignedProjects({
  projects,
}: {
  projects: ClientListRow["assignedProjects"];
}) {
  if (projects.length === 0) {
    return <span className="text-[14px] text-[#98A2B3]">0</span>;
  }

  return (
    <div className="group relative inline-flex">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[14px] font-medium text-[#475467] transition hover:bg-[#F2F4F7] hover:text-[#101828]"
        aria-label={`${projects.length} assigned ${
          projects.length === 1 ? "project" : "projects"
        }`}
      >
        <span>{projects.length}</span>

        <span className="text-[#667085]">
          {projects.length === 1 ? "Project" : "Projects"}
        </span>
      </button>

      {/* Hover popover */}
      <div className="pointer-events-none absolute left-1/2 top-full z-[80] hidden w-[280px] -translate-x-1/2 pt-2 group-hover:block group-focus-within:block">
        <div className="pointer-events-auto overflow-hidden rounded-xl border border-[#EAECF0] bg-white shadow-[0_12px_32px_rgba(16,24,40,0.16)]">
          <div className="border-b border-[#EAECF0] bg-[#F9FAFB] px-4 py-3 text-left">
            <p className="text-[13px] font-semibold text-[#101828]">
              Assigned Projects
            </p>

            <p className="mt-0.5 text-[12px] text-[#667085]">
              {projects.length} {projects.length === 1 ? "project" : "projects"}{" "}
              assigned
            </p>
          </div>

          <div className="max-h-[260px] overflow-y-auto p-2">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group/project flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[#F0F9FF]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-[#344054] transition group-hover/project:text-[#0284C7]">
                    {project.name}
                  </span>

                  <span className="mt-0.5 block text-[11px] text-[#98A2B3]">
                    View project details
                  </span>
                </span>

                <ChevronRight
                  size={16}
                  className="shrink-0 text-[#98A2B3] transition group-hover/project:translate-x-0.5 group-hover/project:text-[#0284C7]"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TEAM AVATARS
   ========================================================= */

function ClientTeam({ members }: { members: ClientTeamMember[] }) {
  if (!members.length) {
    return <div className="text-center text-[#98A2B3]">-</div>;
  }

  const visible = members.slice(0, 5);

  const remaining = members.length - visible.length;

  return (
    <div className="flex justify-center">
      <div className="flex items-center">
        {visible.map((member, index) => (
          <div
            key={member.id}
            title={member.name}
            className={cn(
              "relative size-6 shrink-0 overflow-hidden rounded-full border-[1.5px] border-white",

              index > 0 && "-ml-1",
            )}
            style={{
              zIndex: 10 - index,
            }}
          >
            {member.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={member.avatar}
                alt={member.name}
                className="size-full object-cover"
              />
            ) : (
              <Avatar
                name={member.name}
                className="!size-full !rounded-full text-[9px]"
              />
            )}

            <span className="pointer-events-none absolute inset-0 rounded-full border border-black/[0.08]" />
          </div>
        ))}

        {remaining > 0 && (
          <span className="-ml-1 grid size-6 place-items-center rounded-full border-2 border-white bg-[#F2F4F7] text-[10px] font-semibold text-[#475467]">
            +{remaining}
          </span>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   LAST ACTIVITY
   ========================================================= */

function formatActivityDate(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const now = new Date();

  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  const startDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();

  const days = Math.floor((startToday - startDate) / 86_400_000);

  if (days <= 0) {
    return "Today";
  }

  if (days === 1) {
    return "Yesterday";
  }

  if (days < 7) {
    return `${days} days ago`;
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",

    day: "numeric",

    year: "numeric",
  }).format(date);
}

type ClientFilterOption =
  | string
  | {
      value: string;
      label: string;
    };

function normalizeClientFilterOption(option: ClientFilterOption) {
  return typeof option === "string"
    ? {
        value: option,

        label: option,
      }
    : option;
}

/* =========================================================
   FILTER DROPDOWN
   ========================================================= */

function ClientFilterDropdown({
  label,
  value,
  options,
  placeholder,
  searchPlaceholder,
  onChange,
  renderOption,
}: {
  label: string;

  value: string;

  options: ClientFilterOption[];

  placeholder: string;

  searchPlaceholder: string;

  onChange: (value: string) => void;

  renderOption?: (value: string) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const [search, setSearch] = useState("");

  const normalizedOptions = useMemo(
    () => options.map(normalizeClientFilterOption),
    [options],
  );

  const selectedOption = normalizedOptions.find(
    (option) => option.value === value,
  );

  const filteredOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return normalizedOptions;
    }

    return normalizedOptions.filter((option) =>
      option.label.toLowerCase().includes(normalizedSearch),
    );
  }, [normalizedOptions, search]);

  return (
    <div className="relative min-w-0">
      <span className="mb-1.5 block text-[13px] font-semibold text-[#344054]">
        {label}
      </span>

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-lg border bg-white px-3.5 text-left shadow-[0_1px_2px_rgba(16,24,40,0.05)]",

          open
            ? "border-[#0284C7] ring-[3px] ring-[#0284C7]/10"
            : "border-[#D0D5DD]",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm",

            value === "All" ? "text-[#98A2B3]" : "text-[#344054]",
          )}
        >
          {value === "All"
            ? placeholder
            : renderOption
              ? renderOption(value)
              : (selectedOption?.label ?? value)}
        </span>

        <ChevronDown
          size={17}
          className={cn(
            "shrink-0 text-[#667085] transition-transform",

            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label={`Close ${label}`}
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => {
              setOpen(false);

              setSearch("");
            }}
          />

          <div className="absolute left-0 top-[76px] z-40 w-full min-w-[260px] overflow-hidden rounded-[10px] border border-[#EAECF0] bg-white p-2 shadow-[0_12px_28px_rgba(16,24,40,0.14)]">
            <label className="relative mb-2 block">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]"
              />

              <input
                autoFocus
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-lg border border-[#D0D5DD] bg-white pl-9 pr-3 text-sm text-[#344054] outline-none placeholder:text-[#98A2B3] focus:border-[#0284C7]"
              />
            </label>

            <div className="max-h-72 overflow-y-auto">
              {filteredOptions.map((option) => {
                const selected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);

                      setOpen(false);

                      setSearch("");
                    }}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-[#344054]",

                      selected ? "bg-[#F0F9FF]" : "hover:bg-[#F9FAFB]",
                    )}
                  >
                    <span className="min-w-0 truncate">
                      {option.value === "All"
                        ? placeholder
                        : renderOption
                          ? renderOption(option.value)
                          : option.label}
                    </span>

                    {selected && (
                      <Check size={17} className="shrink-0 text-[#0284C7]" />
                    )}
                  </button>
                );
              })}

              {!filteredOptions.length && (
                <div className="px-3 py-6 text-center text-sm text-[#98A2B3]">
                  No matching options.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


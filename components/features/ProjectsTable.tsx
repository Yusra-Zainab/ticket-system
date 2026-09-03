"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import ProjectStatus from "@/components/features/ProjectStatus";
import { usePageSearch } from "@/components/providers/PageSearchProvider";
import { Avatar } from "@/components/ui/Avatar";
import { SortArrows } from "@/components/ui/SortArrows";
import {
  projectPriorityDescriptions,
  projectStatusDescriptions,
} from "@/lib/statusOptions";
import { cn } from "@/lib/utils";

import type {
  Project,
  ProjectPriority,
  ProjectStatus as ProjectStatusType,
} from "@/types";

const priorities: Array<{
  value: ProjectPriority;
  className: string;
}> = [
  {
    value: "Critical",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  {
    value: "High",
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
  {
    value: "Medium",
    className: "border-yellow-200 bg-yellow-50 text-yellow-700",
  },
  {
    value: "Low",
    className: "border-green-200 bg-green-50 text-green-700",
  },
  {
    value: "Not Assigned",
    className: "border-slate-200 bg-slate-50 text-slate-600",
  },
];

const openTicketFilters = ["All", "0", "1 - 5", "6 - 10", "11+"] as const;

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

type SortKey =
  | "name"
  | "client"
  | "status"
  | "openTickets"
  | "criticalTickets"
  | "lastUpdated";

type SortDirection = "asc" | "desc";

function matchesOpenTickets(
  project: Project,
  filter: (typeof openTicketFilters)[number],
) {
  if (filter === "All") return true;
  if (filter === "0") return project.openTickets === 0;
  if (filter === "1 - 5")
    return project.openTickets >= 1 && project.openTickets <= 5;
  if (filter === "6 - 10")
    return project.openTickets >= 6 && project.openTickets <= 10;

  return project.openTickets >= 11;
}

function relativeDate(value: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  const now = new Date();

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const startDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  const difference = Math.floor(
    (startToday.getTime() - startDate.getTime()) / 86_400_000,
  );

  if (difference <= 0) return "Today";
  if (difference === 1) return "Yesterday";

  return `${difference} days ago`;
}

async function patchProject(id: string, payload: Record<string, unknown>) {
  const response = await fetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) return;

  let message = "Unable to update project.";

  try {
    const result = await response.json();

    if (typeof result?.error === "string") {
      message = result.error;
    }
  } catch {
    // Use fallback.
  }

  throw new Error(message);
}

export default function ProjectsTable({
  initialProjects,
  projectHrefBase = "/projects",
}: {
  initialProjects: Project[];
  projectHrefBase?: string;
}) {
  const [projects, setProjects] = useState(initialProjects);

  const { query, setQuery } = usePageSearch();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [client, setClient] = useState("All");
  const [status, setStatus] = useState<"All" | ProjectStatusType>("All");

  const [openTickets, setOpenTickets] =
    useState<(typeof openTicketFilters)[number]>("All");

  const [criticalOnly, setCriticalOnly] = useState(false);

  const [teamMember, setTeamMember] = useState("All");

  const [selected, setSelected] = useState<string[]>([]);

  const [sort, setSort] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "lastUpdated",
    direction: "desc",
  });

  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);

  const [priorityDraft, setPriorityDraft] =
    useState<ProjectPriority>("Not Assigned");

  const [savingPriority, setSavingPriority] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [toast, setToast] = useState<{
    kind: "success" | "error";
    message: string;
  }>();

  const clients = useMemo(
    () =>
      Array.from(
        new Set(projects.map((project) => project.client).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [projects],
  );

  const statuses = projectStatuses;

  const teamMembers = useMemo(
    () =>
      Array.from(
        new Set(
          projects.flatMap((project) =>
            project.teamMembers.map((member) => member.name),
          ),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [projects],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const next = projects.filter((project) => {
      const matchesSearch =
        !normalizedQuery ||
        `${project.name} ${project.client} ${project.status} ${project.teamMembers
          .map((member) => member.name)
          .join(" ")}`
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesClient = client === "All" || project.client === client;

      const matchesStatus = status === "All" || project.status === status;

      const matchesTickets = matchesOpenTickets(project, openTickets);

      const matchesCritical = !criticalOnly || project.criticalTickets > 0;

      const matchesTeam =
        teamMember === "All" ||
        project.teamMembers.some((member) => member.name === teamMember);

      return (
        matchesSearch &&
        matchesClient &&
        matchesStatus &&
        matchesTickets &&
        matchesCritical &&
        matchesTeam
      );
    });

    return [...next].sort((a, b) => {
      let left: string | number;
      let right: string | number;

      switch (sort.key) {
        case "openTickets":
          left = a.openTickets;
          right = b.openTickets;
          break;

        case "criticalTickets":
          left = a.criticalTickets;
          right = b.criticalTickets;
          break;

        case "lastUpdated":
          left = new Date(a.lastUpdated).getTime() || 0;

          right = new Date(b.lastUpdated).getTime() || 0;
          break;

        default:
          left = String(a[sort.key]);
          right = String(b[sort.key]);
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
  }, [
    projects,
    query,
    client,
    status,
    openTickets,
    criticalOnly,
    teamMember,
    sort,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  const currentPage = Math.min(page, pageCount);

  const pageStart = (currentPage - 1) * pageSize;

  const visibleProjects = filtered.slice(pageStart, pageStart + pageSize);

  const visibleIds = visibleProjects.map((project) => project.id);

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  const hasFilters =
    client !== "All" ||
    status !== "All" ||
    openTickets !== "All" ||
    criticalOnly ||
    teamMember !== "All";

  const notify = (kind: "success" | "error", message: string) => {
    setToast({ kind, message });

    if (kind === "success") {
      window.setTimeout(() => setToast(undefined), 3000);
    }
  };

  const toggleSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const toggleVisible = () => {
    if (allVisibleSelected) {
      setSelected((current) =>
        current.filter((id) => !visibleIds.includes(id)),
      );

      return;
    }

    setSelected((current) => Array.from(new Set([...current, ...visibleIds])));
  };

  const toggleProject = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const clearFilters = () => {
    setClient("All");
    setStatus("All");
    setOpenTickets("All");
    setCriticalOnly(false);
    setTeamMember("All");
    setPage(1);
  };

  const applyPriority = async () => {
    if (!selected.length) {
      notify("error", "Select at least one project first.");

      return;
    }

    try {
      setSavingPriority(true);

      await Promise.all(
        selected.map((id) =>
          patchProject(id, {
            priority: priorityDraft,
          }),
        ),
      );

      setProjects((current) =>
        current.map((project) =>
          selected.includes(project.id)
            ? {
                ...project,
                priority: priorityDraft,
              }
            : project,
        ),
      );

      setSelected([]);
      setPriorityDialogOpen(false);

      notify("success", `Priority changed to ${priorityDraft}.`);
    } catch (error) {
      notify(
        "error",
        error instanceof Error
          ? error.message
          : "Unable to update selected projects.",
      );
    } finally {
      setSavingPriority(false);
    }
  };

  const start = filtered.length === 0 ? 0 : pageStart + 1;

  const end = Math.min(pageStart + pageSize, filtered.length);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
            className={cn(
              "ticket-tool-button",
              filtersOpen && "border-[#0284C7] text-[#0284C7]",
            )}
          >
            <Filter size={18} />
            Filters
          </button>

          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const selectedProject = projects.find((project) =>
                  selected.includes(project.id),
                );

                setPriorityDraft(selectedProject?.priority ?? "Not Assigned");

                setPriorityDialogOpen(true);
              }}
              className="ticket-tool-button"
            >
              Change Priority Type of Selected
            </button>
          )}
        </div>

        <label className="relative ml-auto w-full xl:w-[365px]">
          <Search
            size={21}
            strokeWidth={1.8}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#667085]"
          />

          <span className="sr-only">Search projects</span>

          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search"
            className="h-[50px] w-full rounded-[8px] border border-[#D0D5DD] bg-white pl-12 pr-4 text-[16px] text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)] placeholder:text-[#667085] focus:border-[#0284C7] focus:outline-none focus:ring-1 focus:ring-[#0284C7]"
          />
        </label>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="rounded-[12px] border border-[#EAECF0] bg-gray-100 p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] xl:items-end">
            <FilterDropdown
              label="Client"
              value={client}
              onChange={(value) => {
                setClient(value);
                setPage(1);
              }}
              options={["All", ...clients]}
            />

            <FilterDropdown
              label="Status"
              value={status}
              onChange={(value) => {
                setStatus(value as "All" | ProjectStatusType);
                setPage(1);
              }}
              options={["All", ...statuses]}
              renderOption={(value) =>
                value === "All" ? (
                  <span className="font-medium text-[#344054]">
                    All statuses
                  </span>
                ) : (
                  <span className="inline-flex min-w-0 items-center gap-3">
                    <ProjectStatus
                      status={value as ProjectStatusType}
                      size="sm"
                      className="!min-w-[110px]"
                    />
                    <span className="truncate text-sm text-[#667085]">
                      {
                        projectStatusDescriptions[
                          value as ProjectStatusType
                        ]
                      }
                    </span>
                  </span>
                )
              }
            />

            <FilterDropdown
              label="Open Tickets"
              value={openTickets}
              onChange={(value) => {
                setOpenTickets(
                  value as (typeof openTicketFilters)[number],
                );
                setPage(1);
              }}
              options={[...openTicketFilters]}
            />

            <div>
              <span className="mb-2 block text-[13px] font-semibold text-[#344054]">
                Critical
              </span>

              <label
                className={cn(
                  "flex h-[46px] cursor-pointer items-center gap-3 rounded-[9px] border bg-white px-3.5",
                  "shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition",
                  criticalOnly
                    ? "border-[#DC2626] bg-[#FEF2F2]"
                    : "border-[#D0D5DD] hover:border-[#98A2B3]",
                )}
              >
                <input
                  type="checkbox"
                  checked={criticalOnly}
                  onChange={(event) => {
                    setCriticalOnly(event.target.checked);
                    setPage(1);
                  }}
                  className="size-[18px] rounded border-[#D0D5DD] accent-[#DC2626]"
                />

                <span
                  className={cn(
                    "text-sm font-medium",
                    criticalOnly ? "text-[#B42318]" : "text-[#344054]",
                  )}
                >
                  Critical tickets only
                </span>
              </label>
            </div>

            <FilterDropdown
              label="Team"
              value={teamMember}
              onChange={(value) => {
                setTeamMember(value);
                setPage(1);
              }}
              options={["All", ...teamMembers]}
            />

            <button
              type="button"
              disabled={!hasFilters}
              onClick={clearFilters}
              className="h-[46px] shrink-0 rounded-lg border border-red-500 px-3 text-sm font-semibold text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:border-slate-400 disabled:text-slate-500 disabled:hover:bg-transparent"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="project-list-table">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] table-fixed text-left">
            <thead>
              <tr>
                <th className="w-[300px]">
                  <div className="flex items-center gap-3">
                    <input
                      aria-label="Select visible projects"
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleVisible}
                      className="project-checkbox"
                    />

                    <SortHeader
                      label="Project Name"
                      sortKey="name"
                      sort={sort}
                      onClick={() => toggleSort("name")}
                    />
                  </div>
                </th>

                <th className="w-[190px]">
                  <SortHeader
                    label="Client"
                    sortKey="client"
                    sort={sort}
                    onClick={() => toggleSort("client")}
                  />
                </th>

                <th className="w-[180px]">
                  <SortHeader
                    label="Status"
                    sortKey="status"
                    sort={sort}
                    onClick={() => toggleSort("status")}
                  />
                </th>

                <th className="w-[135px] text-center">
                  <SortHeader
                    label="Open Tickets"
                    sortKey="openTickets"
                    sort={sort}
                    onClick={() => toggleSort("openTickets")}
                    centered
                  />
                </th>

                <th className="w-[120px] text-center">
                  <SortHeader
                    label="Critical"
                    sortKey="criticalTickets"
                    sort={sort}
                    onClick={() => toggleSort("criticalTickets")}
                    centered
                  />
                </th>

                <th className="w-[220px]">Team</th>

                <th className="w-[150px]">
                  <SortHeader
                    label="Last Updated"
                    sortKey="lastUpdated"
                    sort={sort}
                    onClick={() => toggleSort("lastUpdated")}
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleProjects.map((project, index) => (
                <tr
                  key={project.id}
                  className={cn(index % 2 === 1 && "bg-[#F5F6F8]")}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${project.name}`}
                        checked={selected.includes(project.id)}
                        onChange={() => toggleProject(project.id)}
                        className="project-checkbox"
                      />

                      {/* No hover rename/popover intentionally. */}
                      <Link
                        href={`${projectHrefBase}/${project.id}`}
                        className="truncate font-semibold text-[#101828] transition-colors hover:text-[#0284C7]"
                      >
                        {project.name}
                      </Link>
                    </div>
                  </td>

                  <td className="truncate">{project.client}</td>

                  <td>
                    <ProjectStatus status={project.status} />
                  </td>

                  <td className="text-center">{project.openTickets}</td>

                  <td className="text-center">{project.criticalTickets}</td>

                  <td>
                    <TeamAvatars project={project} />
                  </td>

                  <td>{relativeDate(project.lastUpdated)}</td>
                </tr>
              ))}

              {!visibleProjects.length && (
                <tr>
                  <td colSpan={7} className="!h-52 text-center">
                    <div className="mx-auto max-w-sm">
                      <p className="font-semibold text-[#101828]">
                        No projects found
                      </p>

                      <p className="mt-1 text-sm text-[#667085]">
                        Try changing the search or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="project-pagination">
          <span className="text-sm text-[#475467]">
            {start} - {end} of {filtered.length.toLocaleString()}
          </span>

          <label className="relative">
            <span className="sr-only">Rows per page</span>

            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-10 appearance-none rounded-lg border border-[#D0D5DD] bg-white py-0 pl-4 pr-10 text-sm font-semibold text-[#344054] shadow-sm outline-none focus:border-[#0284C7]"
            >
              <option value={10}>10 per page</option>

              <option value={20}>20 per page</option>

              <option value={50}>50 per page</option>
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#344054]"
            />
          </label>

          <div className="flex overflow-hidden rounded-lg border border-[#D0D5DD] bg-white">
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="grid size-10 place-items-center text-[#344054] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage >= pageCount}
              onClick={() =>
                setPage(Math.min(pageCount, currentPage + 1))
              }
              className="grid size-10 place-items-center border-l border-[#D0D5DD] text-[#344054] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk priority */}
      {priorityDialogOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPriorityDialogOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-priority-dialog-title"
            className="ticket-modal !w-[520px]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="project-priority-dialog-title"
                  className="text-[22px] font-bold text-[#101828]"
                >
                  Change Priority Type
                </h2>

                <p className="mt-1 text-sm text-[#667085]">
                  Change priority for {selected.length} selected project
                  {selected.length === 1 ? "" : "s"}.
                </p>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setPriorityDialogOpen(false)}
                className="grid size-9 place-items-center rounded-lg text-[#667085] hover:bg-[#F2F4F7]"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {priorities.map((priority) => (
                <button
                  type="button"
                  key={priority.value}
                  onClick={() => setPriorityDraft(priority.value)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left transition",
                    priority.className,
                    priorityDraft === priority.value &&
                      "outline outline-2 outline-offset-2 outline-[#0284C7]",
                  )}
                >
                  <span className="block text-sm font-semibold">
                    {priority.value}
                  </span>
                  <span className="mt-1 block text-xs font-medium text-current/80">
                    {projectPriorityDescriptions[priority.value]}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                disabled={savingPriority}
                onClick={() => setPriorityDialogOpen(false)}
                className="button-secondary"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={savingPriority}
                onClick={applyPriority}
                className="button-primary min-w-[110px]"
              >
                {savingPriority ? "Saving..." : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}

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
            onClick={() => setToast(undefined)}
            className="ml-auto"
            aria-label="Dismiss"
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  centered = false,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; direction: SortDirection };
  centered?: boolean;
  onClick: () => void;
}) {
  const active = sort.key === sortKey;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold text-[#475467]",
        centered && "justify-center",
      )}
    >
      {label}

      <SortArrows direction={active ? sort.direction : null} />
    </button>
  );
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  renderOption,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  renderOption?: (value: string) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <span className="mb-2 block text-[13px] font-semibold text-[#344054]">
        {label}
      </span>

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-[46px] w-full items-center justify-between gap-3",
          "rounded-[9px] border bg-white px-3.5",
          "text-left text-sm text-[#344054]",
          "shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
          "transition",
          open
            ? "border-[#0284C7] ring-2 ring-[#0284C7]/10"
            : "border-[#D0D5DD] hover:border-[#98A2B3]",
        )}
      >
        <span className="min-w-0 truncate">
          {renderOption ? renderOption(value) : value}
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
            aria-label={`Close ${label} dropdown`}
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div
            role="listbox"
            className="absolute left-0 top-[76px] z-40 w-full min-w-[220px] overflow-hidden rounded-[10px] border border-[#EAECF0] bg-white p-1.5 shadow-[0_12px_28px_rgba(16,24,40,0.14)]"
          >
            <div className="max-h-[280px] overflow-y-auto">
              {options.map((option) => {
                const selected = value === option;

                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(option);

                      setOpen(false);
                    }}
                    className={cn(
                      "flex min-h-[42px] w-full items-center justify-between gap-3 rounded-[7px] px-3 py-2 text-left text-sm transition",
                      selected ? "bg-[#F0F9FF]" : "hover:bg-[#F9FAFB]",
                    )}
                  >
                    <span className="min-w-0">
                      {renderOption ? renderOption(option) : option}
                    </span>

                    {selected && (
                      <span className="size-2 shrink-0 rounded-full bg-[#0284C7]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TeamAvatars({ project }: { project: Project }) {
  const visible = project.teamMembers.slice(0, 5);

  const remaining = project.teamMembers.length - visible.length;

  if (!project.teamMembers.length) {
    return <span className="text-sm text-[#98A2B3]">-</span>;
  }

  return (
    <div className="flex items-center">
      {visible.map((member, index) =>
        member.avatar ? (
          <span
            key={member.id}
            title={member.name}
            className={cn(
              "relative inline-flex size-8 shrink-0 overflow-hidden rounded-full border-2 border-white bg-[#F2F4F7]",
              index > 0 && "-ml-2",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={member.avatar}
              alt=""
              className="size-full object-cover"
            />
          </span>
        ) : (
          <Avatar
            key={member.id}
            name={member.name}
            className={cn(
              "!size-8 border-2 border-white text-[10px]",
              index > 0 && "-ml-2",
            )}
          />
        ),
      )}

      {remaining > 0 && (
        <span className="-ml-2 inline-flex size-8 items-center justify-center rounded-full border-2 border-white bg-[#F2F4F7] text-[11px] font-semibold text-[#475467]">
          +{remaining}
        </span>
      )}
    </div>
  );
}

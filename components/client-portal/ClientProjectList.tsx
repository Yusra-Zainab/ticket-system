"use client";

import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Filter,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";

import ProjectStatus, {
  normalizeProjectStatus,
} from "@/components/features/ProjectStatus";
import { usePageSearch } from "@/components/providers/PageSearchProvider";
import { Avatar } from "@/components/ui/Avatar";
import { projectStatusDescriptions } from "@/lib/statusOptions";
import { cn } from "@/lib/utils";
import type { ClientPortalProject } from "@/types/clientPortal";

const openTicketFilters = ["All", "0", "1 - 5", "6 - 10", "11+"] as const;

const projectStatuses = [
  "Planning",
  "Not Started",
  "Active",
  "On Hold",
  "At Risk",
  "Delayed",
  "Completed",
  "Cancelled",
  "Archived",
] as const;


type OpenTicketFilter = (typeof openTicketFilters)[number];

type SortKey =
  | "name"
  | "company"
  | "status"
  | "openTickets"
  | "criticalTickets"
  | "updatedAt";

type SortDirection = "asc" | "desc";

function matchesOpenTickets(project: ClientPortalProject, filter: OpenTicketFilter) {
  if (filter === "All") return true;
  if (filter === "0") return project.openTickets === 0;
  if (filter === "1 - 5") {
    return project.openTickets >= 1 && project.openTickets <= 5;
  }
  if (filter === "6 - 10") {
    return project.openTickets >= 6 && project.openTickets <= 10;
  }
  return project.openTickets >= 11;
}

function relativeDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round(
    (startToday.getTime() - startDate.getTime()) / 86_400_000,
  );

  if (days === 0) {
    return `Today, ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  if (days === 1) return "Yesterday";

  if (days > 1 && days < 7) return `${days} days ago`;

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function ClientProjectList({
  projects,
}: {
  projects: ClientPortalProject[];
}) {
  const { query, setQuery } = usePageSearch();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [status, setStatus] = useState("All");
  const [openTickets, setOpenTickets] = useState<OpenTicketFilter>("All");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [teamMember, setTeamMember] = useState("All");

  const [sort, setSort] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "updatedAt",
    direction: "desc",
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rows = projects;


  const statuses = projectStatuses;

  const teamMembers = useMemo(
    () =>
      Array.from(
        new Set(
          rows.flatMap((project) =>
            project.team.map((member) => member.name).filter(Boolean),
          ),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const next = rows.filter((project) => {
      const matchesSearch =
        !normalizedQuery ||
        [
          project.name,
          project.company,
          project.status,
          project.priority,
          project.moduleName,
          project.subModule,
          ...project.team.map((member) => member.name),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesStatus = status === "All" || project.status === status;
      const matchesTickets = matchesOpenTickets(project, openTickets);
      const matchesCritical = !criticalOnly || project.criticalTickets > 0;
      const matchesTeam =
        teamMember === "All" ||
        project.team.some((member) => member.name === teamMember);

      return (
        matchesSearch &&
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
        case "updatedAt":
          left = new Date(a.updatedAt).getTime() || 0;
          right = new Date(b.updatedAt).getTime() || 0;
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
  }, [
    rows,
    query,
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
  const first = filtered.length ? pageStart + 1 : 0;
  const last = Math.min(pageStart + pageSize, filtered.length);

  const hasFilters =
    status !== "All" ||
    openTickets !== "All" ||
    criticalOnly ||
    teamMember !== "All";

  function clearFilters() {
    setStatus("All");
    setOpenTickets("All");
    setCriticalOnly(false);
    setTeamMember("All");
    setPage(1);
  }

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  }

  return (
    <section className="client-project-list">
      <style>{`
        .client-project-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
        }

        .client-project-list-toolbar {
          display: flex;
          min-height: 44px;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .client-project-list .ticket-tool-button {
          min-height: 40px;
          height: 40px;
          padding: 8px 14px;
          border-radius: 8px;
          border-color: #d0d5dd;
          font-family: var(--font-geist), Inter, Arial, sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
        }

        .client-project-search {
          position: relative;
          display: block;
          width: min(320px, 100%);
        }

        .client-project-search svg {
          position: absolute;
          top: 50%;
          left: 14px;
          transform: translateY(-50%);
          color: #667085;
          pointer-events: none;
        }

        .client-project-search input {
          width: 100%;
          height: 44px;
          border: 1px solid #d0d5dd;
          border-radius: 8px;
          background: #fff;
          padding: 10px 14px 10px 42px;
          color: #101828;
          font-family: var(--font-geist), Inter, Arial, sans-serif;
          font-size: 16px;
          line-height: 24px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
          outline: none;
        }

        .client-project-search input::placeholder {
          color: #667085;
        }

        .client-project-search input:focus {
          border-color: #06b6d4;
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.12);
        }

        .client-project-filter-panel {
          border: 1px solid #eaecf0;
          border-radius: 12px;
          background: #f2f4f7;
          padding: 20px;
        }

        .client-project-filter-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .client-project-filter {
          position: relative;
          min-width: 0;
        }

        .client-project-filter-label {
          display: block;
          margin-bottom: 8px;
          color: #344054;
          font-family: var(--font-geist), Inter, Arial, sans-serif;
          font-size: 14px;
          font-weight: 600;
          line-height: 20px;
        }

        .client-project-filter-trigger {
          display: flex;
          width: 100%;
          height: 46px;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border: 1px solid #d0d5dd;
          border-radius: 9px;
          background: #fff;
          padding: 0 12px;
          color: #344054;
          font-family: var(--font-geist), Inter, Arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          line-height: 20px;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
          cursor: pointer;
        }

        .client-project-filter-trigger:hover,
        .client-project-filter-trigger[data-open="true"] {
          border-color: #06b6d4;
        }

        .client-project-filter-menu {
          position: absolute;
          top: 76px;
          left: 0;
          z-index: 50;
          width: 100%;
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #eaecf0;
          border-radius: 10px;
          background: #fff;
          padding: 8px;
          box-shadow: 0 12px 28px rgba(16, 24, 40, 0.14);
        }

        .client-project-filter-option {
          display: flex;
          width: 100%;
          min-height: 42px;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          padding: 8px 10px;
          color: #344054;
          text-align: left;
          cursor: pointer;
        }

        .client-project-filter-option:hover {
          background: #f9fafb;
        }

        .client-project-filter-copy {
          min-width: 0;
        }

        .client-project-filter-copy strong,
        .client-project-filter-copy small {
          display: block;
        }

        .client-project-filter-copy strong {
          color: #344054;
          font-size: 14px;
          font-weight: 600;
        }

        .client-project-filter-copy small {
          margin-top: 2px;
          color: #667085;
          font-size: 12px;
          line-height: 18px;
        }

        .client-project-status-option {
          min-height: 52px;
          align-items: center;
        }

        .client-project-status-option .client-project-filter-copy {
          display: flex;
          min-width: 0;
          flex: 1 1 auto;
          flex-direction: row;
          align-items: center;
          gap: 12px;
        }

        /*
         * Keep every status badge exactly the same size so the description
         * starts on the same vertical line for every option.
         */
        .client-project-status-option .client-project-status-badge {
          width: 118px !important;
          min-width: 118px !important;
          max-width: 118px !important;
          height: 24px !important;
          justify-content: center !important;
          overflow: hidden;
          padding-right: 8px !important;
          padding-left: 8px !important;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .client-project-status-option small {
          display: block;
          min-width: 0;
          flex: 1 1 auto;
          margin: 0;
          overflow: hidden;
          color: #667085;
          font-size: 12px;
          font-weight: 400;
          line-height: 18px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .client-project-status-menu {
          min-width: 540px;
          width: max(100%, 540px);
          max-width: min(620px, calc(100vw - 48px));
          max-height: 420px;
        }

        .client-project-status-trigger-badge {
          width: 118px !important;
          min-width: 118px !important;
          max-width: 118px !important;
          height: 24px !important;
          justify-content: center !important;
          overflow: hidden;
          padding-right: 8px !important;
          padding-left: 8px !important;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 640px) {
          .client-project-status-menu {
            min-width: min(500px, calc(100vw - 32px));
            width: min(500px, calc(100vw - 32px));
          }

          .client-project-status-option .client-project-filter-copy {
            gap: 10px;
          }

          .client-project-status-option .client-project-status-badge {
            width: 108px !important;
            min-width: 108px !important;
            max-width: 108px !important;
          }
        }

        .client-project-critical-toggle {
          display: flex;
          height: 46px;
          align-items: center;
          gap: 10px;
          border: 1px solid #d0d5dd;
          border-radius: 9px;
          background: #fff;
          padding: 0 12px;
          color: #344054;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
        }

        .client-project-critical-toggle input {
          width: 16px;
          height: 16px;
          accent-color: #0284c7;
        }

        .client-project-filter-footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .client-project-clear {
          min-height: 38px;
          border: 1px solid #f04438;
          border-radius: 8px;
          background: #fff;
          padding: 8px 12px;
          color: #d92d20;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .client-project-clear:hover:not(:disabled) {
          background: #f04438;
          color: #fff;
        }

        .client-project-clear:disabled {
          cursor: not-allowed;
          border-color: #d0d5dd;
          color: #98a2b3;
        }


        .client-project-table-frame {
          overflow: hidden;
          border: 1px solid #eaecf0;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);
        }

        .client-project-table-scroll {
          overflow-x: auto;
        }

        .client-project-table {
          width: 100%;
          min-width: 1150px;
          table-layout: fixed;
          border-collapse: collapse;
          text-align: left;
        }

        .client-project-table thead {
          height: 44px;
          background: #f9fafb;
        }

        .client-project-table th {
          border-bottom: 1px solid #eaecf0;
          padding: 0 18px;
          color: #475467;
          font-family: var(--font-geist), Inter, Arial, sans-serif;
          font-size: 12px;
          font-weight: 600;
          line-height: 18px;
          vertical-align: middle;
        }

        .client-project-table tbody tr {
          height: 72px;
          border-bottom: 1px solid #eaecf0;
        }

        .client-project-table tbody tr:nth-child(even) {
          background: #f2f4f7;
        }

        .client-project-table tbody tr:last-child {
          border-bottom: 0;
        }

        .client-project-table td {
          padding: 0 18px;
          color: #475467;
          font-family: var(--font-geist), Inter, Arial, sans-serif;
          font-size: 14px;
          font-weight: 400;
          line-height: 20px;
          vertical-align: middle;
        }

        .client-project-name-link {
          display: block;
          overflow: hidden;
          color: #101828;
          font-weight: 600;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-decoration: none;
        }

        .client-project-name-link:hover {
          color: #0284c7;
        }

        .client-project-name-meta {
          display: block;
          overflow: hidden;
          margin-top: 3px;
          color: #667085;
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .client-project-critical-count {
          display: inline-flex;
          min-width: 28px;
          height: 24px;
          align-items: center;
          justify-content: center;
          border: 1px solid #fecdca;
          border-radius: 16px;
          background: #fef3f2;
          padding: 2px 8px;
          color: #b42318;
          font-size: 12px;
          font-weight: 600;
        }

        .client-project-critical-count[data-empty="true"] {
          border-color: #eaecf0;
          background: #f9fafb;
          color: #667085;
        }

        .client-project-team {
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .client-project-team .client-project-team-avatar + .client-project-team-avatar {
          margin-left: -9px;
        }

        .client-project-team-avatar {
          border: 2px solid #fff;
        }

        .client-project-team-more {
          display: grid;
          width: 32px;
          height: 32px;
          place-items: center;
          margin-left: -9px;
          border: 2px solid #fff;
          border-radius: 50%;
          background: #f2f4f7;
          color: #475467;
          font-size: 10px;
          font-weight: 700;
        }

        .client-project-table-empty {
          height: 208px !important;
          text-align: center;
        }

        .client-project-table-empty strong {
          display: block;
          color: #101828;
          font-size: 14px;
          font-weight: 600;
        }

        .client-project-table-empty span {
          display: block;
          margin-top: 4px;
          color: #667085;
          font-size: 13px;
        }

        .client-project-pagination {
          display: flex;
          min-height: 60px;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          border-top: 1px solid #eaecf0;
          background: #fff;
          padding: 12px 24px;
        }

        .client-project-pagination-count {
          color: #475467;
          font-family: var(--font-geist), Inter, Arial, sans-serif;
          font-size: 12px;
          line-height: 15px;
        }

        .client-project-page-size {
          position: relative;
        }

        .client-project-page-size select {
          height: 36px;
          appearance: none;
          border: 1px solid #d0d5dd;
          border-radius: 8px;
          background: #fff;
          padding: 0 36px 0 12px;
          color: #344054;
          font-size: 14px;
          font-weight: 600;
          outline: none;
        }

        .client-project-page-size svg {
          position: absolute;
          top: 50%;
          right: 11px;
          transform: translateY(-50%);
          pointer-events: none;
          color: #344054;
        }

        .client-project-page-buttons {
          display: flex;
          overflow: hidden;
          border: 1px solid #d0d5dd;
          border-radius: 8px;
          background: #fff;
        }

        .client-project-page-buttons button {
          display: grid;
          width: 36px;
          height: 36px;
          place-items: center;
          border: 0;
          background: #fff;
          color: #344054;
          cursor: pointer;
        }

        .client-project-page-buttons button + button {
          border-left: 1px solid #d0d5dd;
        }

        .client-project-page-buttons button:hover:not(:disabled) {
          background: #f9fafb;
        }

        .client-project-page-buttons button:disabled {
          cursor: not-allowed;
          opacity: 0.4;
        }

        @media (max-width: 1180px) {
          .client-project-filter-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .client-project-list-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .client-project-search {
            width: 100%;
          }

          .client-project-filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .client-project-filter-grid {
            grid-template-columns: 1fr;
          }

          .client-project-pagination {
            align-items: flex-end;
            flex-wrap: wrap;
          }
        }
      `}</style>

      <div className="client-project-list-toolbar">
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

        <label className="client-project-search">
          <Search size={20} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search"
          />
        </label>
      </div>

      {filtersOpen && (
        <div className="client-project-filter-panel">
          <div className="client-project-filter-grid">

            <StatusFilterDropdown
              value={status}
              options={statuses}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            />

            <FilterDropdown
              label="Open Tickets"
              value={openTickets}
              allLabel="All open ticket counts"
              options={openTicketFilters.slice(1)}
              onChange={(value) => {
                setOpenTickets(value as OpenTicketFilter);
                setPage(1);
              }}
            />

            <div className="client-project-filter">
              <span className="client-project-filter-label">Critical</span>
              <label className="client-project-critical-toggle">
                <input
                  type="checkbox"
                  checked={criticalOnly}
                  onChange={(event) => {
                    setCriticalOnly(event.target.checked);
                    setPage(1);
                  }}
                />
                Critical tickets only
              </label>
            </div>

            <FilterDropdown
              label="Team"
              value={teamMember}
              allLabel="All team members"
              options={teamMembers}
              onChange={(value) => {
                setTeamMember(value);
                setPage(1);
              }}
            />
          </div>

          <div className="client-project-filter-footer">
            <button
              type="button"
              disabled={!hasFilters}
              onClick={clearFilters}
              className="client-project-clear"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      <div className="client-project-table-frame">
        <div className="client-project-table-scroll">
          <table className="client-project-table">
            <thead>
              <tr>
                <th style={{ width: 300 }}>
                  <SortHeader
                    label="Project Name"
                    active={sort.key === "name"}
                    direction={sort.direction}
                    onClick={() => toggleSort("name")}
                  />
                </th>

                <th style={{ width: 190 }}>
                  <SortHeader
                    label="Client"
                    active={sort.key === "company"}
                    direction={sort.direction}
                    onClick={() => toggleSort("company")}
                  />
                </th>

                <th style={{ width: 180 }}>
                  <SortHeader
                    label="Status"
                    active={sort.key === "status"}
                    direction={sort.direction}
                    onClick={() => toggleSort("status")}
                  />
                </th>

                <th style={{ width: 135, textAlign: "center" }}>
                  <SortHeader
                    label="Open Tickets"
                    active={sort.key === "openTickets"}
                    direction={sort.direction}
                    centered
                    onClick={() => toggleSort("openTickets")}
                  />
                </th>

                <th style={{ width: 120, textAlign: "center" }}>
                  <SortHeader
                    label="Critical"
                    active={sort.key === "criticalTickets"}
                    direction={sort.direction}
                    centered
                    onClick={() => toggleSort("criticalTickets")}
                  />
                </th>

                <th style={{ width: 220 }}>Team</th>

                <th style={{ width: 150 }}>
                  <SortHeader
                    label="Last Updated"
                    active={sort.key === "updatedAt"}
                    direction={sort.direction}
                    onClick={() => toggleSort("updatedAt")}
                  />
                </th>
              </tr>
            </thead>

            <tbody>
              {visibleProjects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link
                      href={`/client-portal/projects/${project.id}`}
                      className="client-project-name-link"
                    >
                      {project.name}
                    </Link>
                    <span className="client-project-name-meta">
                      {project.moduleName || project.subModule || project.priority}
                    </span>
                  </td>

                  <td>{project.company || "—"}</td>

                  <td>
                    <ProjectStatus status={project.status} />
                  </td>

                  <td style={{ textAlign: "center" }}>{project.openTickets}</td>

                  <td style={{ textAlign: "center" }}>
                    <span
                      className="client-project-critical-count"
                      data-empty={project.criticalTickets === 0}
                    >
                      {project.criticalTickets}
                    </span>
                  </td>

                  <td>
                    <TeamAvatars project={project} />
                  </td>

                  <td>{relativeDate(project.updatedAt)}</td>
                </tr>
              ))}

              {!visibleProjects.length && (
                <tr>
                  <td colSpan={7} className="client-project-table-empty">
                    <strong>No projects found</strong>
                    <span>Try changing the search or filters.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="client-project-pagination">
          <span className="client-project-pagination-count">
            {first} - {last} of {filtered.length.toLocaleString()}
          </span>

          <label className="client-project-page-size">
            <span className="sr-only">Rows per page</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <ChevronDown size={16} />
          </label>

          <div className="client-project-page-buttons">
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              aria-label="Next page"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterDropdown({
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  label: string;
  value: string;
  allLabel: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="client-project-filter">
      <span className="client-project-filter-label">{label}</span>

      <button
        type="button"
        data-open={open}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="client-project-filter-trigger"
      >
        <span className="truncate">{value === "All" ? allLabel : value}</span>
        <ChevronDown
          size={17}
          className={cn("shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label={`Close ${label} filter`}
            onClick={() => setOpen(false)}
          />

          <div className="client-project-filter-menu">
            <button
              type="button"
              className="client-project-filter-option"
              onClick={() => {
                onChange("All");
                setOpen(false);
              }}
            >
              <span>{allLabel}</span>
              {value === "All" && <Check size={16} color="#0284c7" />}
            </button>

            {options.map((option) => (
              <button
                type="button"
                key={option}
                className="client-project-filter-option"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                <span>{option}</span>
                {value === option && <Check size={16} color="#0284c7" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusFilterDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="client-project-filter">
      <span className="client-project-filter-label">Status</span>

      <button
        type="button"
        data-open={open}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="client-project-filter-trigger"
      >
        {value === "All" ? (
          <span>All statuses</span>
        ) : (
          <ProjectStatus
            status={value}
            subtle
            size="sm"
            className="client-project-status-trigger-badge"
          />
        )}

        <ChevronDown
          size={17}
          className={cn("shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close status filter"
            onClick={() => setOpen(false)}
          />

          <div className="client-project-filter-menu client-project-status-menu">
            <button
              type="button"
              className="client-project-filter-option client-project-status-option"
              onClick={() => {
                onChange("All");
                setOpen(false);
              }}
            >
              <span className="client-project-filter-copy">
                <strong
                  style={{
                    width: 118,
                    minWidth: 118,
                    color: "#344054",
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: "18px",
                    textAlign: "center",
                  }}
                >
                  All statuses
                </strong>
                <small>Show projects in every status.</small>
              </span>
              {value === "All" && <Check size={16} color="#0284c7" />}
            </button>

            {options.map((option) => {
              const normalized = normalizeProjectStatus(option);

              return (
                <button
                  type="button"
                  key={option}
                  className="client-project-filter-option client-project-status-option"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  <span className="client-project-filter-copy">
                    <ProjectStatus
                      status={option}
                      subtle
                      size="sm"
                      className="client-project-status-badge"
                    />
                    <small>{projectStatusDescriptions[normalized]}</small>
                  </span>

                  {value === option && <Check size={16} color="#0284c7" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TeamAvatars({ project }: { project: ClientPortalProject }) {
  const visible = project.team.slice(0, 4);
  const remaining = Math.max(0, project.team.length - visible.length);

  if (!project.team.length) {
    return <span className="text-[#98A2B3]">—</span>;
  }

  return (
    <div
      className="client-project-team"
      title={project.team.map((member) => member.name).join(", ")}
    >
      {visible.map((member) => (
        <Avatar
          key={member.id}
          name={member.name}
          className="client-project-team-avatar !size-8"
        />
      ))}

      {remaining > 0 && (
        <span className="client-project-team-more">+{remaining}</span>
      )}
    </div>
  );
}

function SortHeader({
  label,
  active,
  direction,
  centered = false,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  centered?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-inherit",
        centered && "justify-center",
      )}
    >
      {label}
      {active ? (
        <ChevronDown
          size={13}
          className={cn(
            "transition-transform",
            direction === "asc" && "rotate-180",
          )}
        />
      ) : (
        <ChevronsUpDown size={13} className="opacity-50" />
      )}
    </button>
  );
}
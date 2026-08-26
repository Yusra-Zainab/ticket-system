"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Filter,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { usePageSearch } from "@/components/providers/PageSearchProvider";
import type { ResourcePortalProject } from "@/types/resourcePortal";

type SortKey =
  | "name"
  | "client"
  | "status"
  | "openTickets"
  | "priority"
  | "lastUpdated";

type SortDirection = "asc" | "desc";

const pageSizes = [10, 20, 50] as const;

function relativeDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  const diff = Math.floor(
    (startToday.getTime() - startDate.getTime()) / 86_400_000,
  );

  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";

  return `${diff} days ago`;
}

function sortValue(project: ResourcePortalProject, key: SortKey) {
  switch (key) {
    case "openTickets":
      return project.openTickets;
    case "lastUpdated":
      return new Date(project.updatedAt).getTime() || 0;
    default:
      return String(project[key] ?? "");
  }
}

export default function ResourceProjectList({
  projects,
}: {
  projects: ResourcePortalProject[];
}) {
  const { query, setQuery } = usePageSearch();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [client, setClient] = useState("All");
  const [status, setStatus] = useState("All");

  const [sort, setSort] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "lastUpdated",
    direction: "desc",
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const clients = useMemo(
    () =>
      Array.from(
        new Set(projects.map((project) => project.client).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [projects],
  );

  const statuses = useMemo(
    () =>
      Array.from(
        new Set(projects.map((project) => project.status).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [projects],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const next = projects.filter((project) => {
      const searchable = [
        project.name,
        project.client,
        project.status,
        project.priority,
        ...project.team.flatMap((member) => [member.name, member.role]),
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (client === "All" || project.client === client) &&
        (status === "All" || project.status === status)
      );
    });

    return [...next].sort((leftProject, rightProject) => {
      const left = sortValue(leftProject, sort.key);
      const right = sortValue(rightProject, sort.key);

      const comparison =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), undefined, {
              numeric: true,
              sensitivity: "base",
            });

      return sort.direction === "asc" ? comparison : comparison * -1;
    });
  }, [projects, query, client, status, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const visible = filtered.slice(pageStart, pageStart + pageSize);

  const start = filtered.length ? pageStart + 1 : 0;
  const end = Math.min(pageStart + pageSize, filtered.length);
  const hasFilters = client !== "All" || status !== "All";

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  }

  function clearFilters() {
    setClient("All");
    setStatus("All");
    setPage(1);
  }

  return (
    <>
      <section className="resource-admin-project-list">
        <div className="resource-admin-project-toolbar">
          <button
            type="button"
            className={
              filtersOpen
                ? "resource-admin-tool-button resource-admin-tool-button-active"
                : "resource-admin-tool-button"
            }
            onClick={() => setFiltersOpen((current) => !current)}
          >
            <Filter size={18} />
            Filters
          </button>

          <label className="resource-admin-project-search">
            <Search size={21} strokeWidth={1.8} />
            <span className="resource-admin-sr-only">Search projects</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search"
              aria-label="Search assigned projects"
            />
          </label>
        </div>

        {filtersOpen ? (
          <div className="resource-admin-project-filter-panel">
            <div className="resource-admin-project-filter-grid">
              <FilterSelect
                label="Client"
                value={client}
                options={["All", ...clients]}
                onChange={(value) => {
                  setClient(value);
                  setPage(1);
                }}
              />

              <FilterSelect
                label="Status"
                value={status}
                options={["All", ...statuses]}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              />
            </div>

            <div className="resource-admin-filter-actions">
              <button
                type="button"
                disabled={!hasFilters}
                onClick={clearFilters}
                className="resource-admin-clear-filters"
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : null}

        <div className="resource-admin-project-list-table">
          <div className="resource-admin-project-table-scroll">
            <table className="resource-admin-project-table">
              <thead>
                <tr>
                  <th className="resource-admin-col-project">
                    <SortHeader
                      label="Project Name"
                      active={sort.key === "name"}
                      onClick={() => toggleSort("name")}
                    />
                  </th>

                  <th className="resource-admin-col-client">
                    <SortHeader
                      label="Client"
                      active={sort.key === "client"}
                      onClick={() => toggleSort("client")}
                    />
                  </th>

                  <th className="resource-admin-col-status">
                    <SortHeader
                      label="Status"
                      active={sort.key === "status"}
                      onClick={() => toggleSort("status")}
                    />
                  </th>

                  <th className="resource-admin-col-open resource-admin-center">
                    <SortHeader
                      label="Open Tickets"
                      active={sort.key === "openTickets"}
                      centered
                      onClick={() => toggleSort("openTickets")}
                    />
                  </th>

                  <th className="resource-admin-col-priority resource-admin-center">
                    <SortHeader
                      label="Priority"
                      active={sort.key === "priority"}
                      centered
                      onClick={() => toggleSort("priority")}
                    />
                  </th>

                  <th className="resource-admin-col-team">Team</th>

                  <th className="resource-admin-col-updated">
                    <SortHeader
                      label="Last Updated"
                      active={sort.key === "lastUpdated"}
                      onClick={() => toggleSort("lastUpdated")}
                    />
                  </th>
                </tr>
              </thead>

              <tbody>
                {visible.map((project, index) => (
                  <tr
                    key={project.id}
                    className={
                      index % 2 === 1 ? "resource-admin-project-row-alt" : ""
                    }
                  >
                    <td>
                      <Link
                        href={`/resource/projects/${project.id}`}
                        className="resource-admin-project-name"
                      >
                        {project.name}
                      </Link>
                    </td>

                    <td>
                      <span className="resource-admin-cell-truncate">
                        {project.client || "—"}
                      </span>
                    </td>

                    <td>
                      <ProjectStatus status={project.status} />
                    </td>

                    <td className="resource-admin-center">
                      {project.openTickets}
                    </td>

                    <td className="resource-admin-center">
                      <PriorityBadge priority={project.priority} />
                    </td>

                    <td>
                      <TeamAvatars project={project} />
                    </td>

                    <td>{relativeDate(project.updatedAt)}</td>
                  </tr>
                ))}

                {!visible.length ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="resource-admin-project-empty-row"
                    >
                      <div>
                        <strong>No projects found</strong>
                        <span>Try changing the search or filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <footer className="resource-admin-project-pagination">
            <span>
              {start} - {end} of {filtered.length.toLocaleString()}
            </span>

            <label className="resource-admin-page-size">
              <span className="resource-admin-sr-only">Rows per page</span>
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
              <ChevronDown size={16} />
            </label>

            <div className="resource-admin-page-buttons">
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
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </footer>
        </div>
      </section>

      <ResourceProjectListStyles />
    </>
  );
}

function SortHeader({
  label,
  active,
  centered = false,
  onClick,
}: {
  label: string;
  active: boolean;
  centered?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        centered
          ? "resource-admin-sort-header resource-admin-sort-header-centered"
          : "resource-admin-sort-header"
      }
      onClick={onClick}
    >
      <span>{label}</span>
      <ChevronsUpDown
        size={15}
        className={active ? "resource-admin-sort-active" : ""}
      />
    </button>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="resource-admin-filter-field">
      <span>{label}</span>
      <span className="resource-admin-filter-select-wrap">
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option === "All" ? (label === "Status" ? "All statuses" : "All clients") : option}
            </option>
          ))}
        </select>
        <ChevronDown size={17} />
      </span>
    </label>
  );
}

function ProjectStatus({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const tone =
    normalized.includes("critical") ||
    normalized.includes("risk") ||
    normalized.includes("delay")
      ? "danger"
      : normalized.includes("complete") || normalized.includes("active")
        ? "success"
        : normalized.includes("hold") ||
            normalized.includes("pause") ||
            normalized.includes("planning")
          ? "warning"
          : "info";

  return (
    <span
      className={`resource-admin-project-status resource-admin-project-status-${tone}`}
    >
      {status || "—"}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const key = priority.toLowerCase().replaceAll(" ", "-");

  return (
    <span
      className={`resource-admin-project-priority resource-admin-project-priority-${key}`}
    >
      {priority || "Not Assigned"}
    </span>
  );
}

function TeamAvatars({ project }: { project: ResourcePortalProject }) {
  const members = project.team.slice(0, 4);

  if (!members.length) {
    return <span className="resource-admin-muted">—</span>;
  }

  return (
    <div className="resource-admin-team-avatars">
      {members.map((member, index) => (
        <span
          key={member.id}
          className="resource-admin-team-avatar"
          style={{ zIndex: members.length - index }}
          title={`${member.name} · ${member.role}`}
        >
          {member.avatar ? (
            <img src={member.avatar} alt="" />
          ) : (
            initials(member.name)
          )}
        </span>
      ))}

      {project.team.length > 4 ? (
        <span className="resource-admin-team-more">
          +{project.team.length - 4}
        </span>
      ) : null}
    </div>
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "R"
  );
}

function ResourceProjectListStyles() {
  return (
    <style>{`
      .resource-admin-project-list,
      .resource-admin-project-list * {
        box-sizing: border-box;
      }

      .resource-admin-project-list {
        display: flex;
        width: 100%;
        min-width: 0;
        flex-direction: column;
        gap: 20px;
        color: #101828;
        font-family: Geist, var(--font-inter), Inter, Arial, sans-serif;
      }

      .resource-admin-sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        clip-path: inset(50%);
      }

      .resource-admin-project-toolbar {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .resource-admin-tool-button {
        display: inline-flex;
        min-height: 48px;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 1px solid #cbd5e1;
        border-radius: 9px;
        background: #ffffff;
        padding: 10px 18px;
        color: #344054;
        font-size: 14px;
        font-weight: 700;
        line-height: 20px;
        box-shadow: 0 1px 2px rgb(15 23 42 / 0.06);
        cursor: pointer;
        transition:
          border-color 0.15s ease,
          background-color 0.15s ease,
          color 0.15s ease;
      }

      .resource-admin-tool-button:hover {
        border-color: #98a2b3;
        background: #f9fafb;
      }

      .resource-admin-tool-button-active {
        border-color: #0284c7;
        color: #0284c7;
      }

      .resource-admin-project-search {
        position: relative;
        display: flex;
        width: min(365px, 100%);
        height: 50px;
        align-items: center;
        margin-left: auto;
      }

      .resource-admin-project-search > svg {
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        color: #667085;
        pointer-events: none;
      }

      .resource-admin-project-search input {
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

      .resource-admin-project-search input::placeholder {
        color: #667085;
      }

      .resource-admin-project-search input:focus {
        border-color: #0284c7;
        box-shadow:
          0 0 0 3px rgb(2 132 199 / 0.1),
          0 1px 2px rgb(16 24 40 / 0.05);
      }

      .resource-admin-project-filter-panel {
        border: 1px solid #eaecf0;
        border-radius: 12px;
        background: #f3f4f6;
        padding: 20px;
        box-shadow: 0 1px 3px rgb(16 24 40 / 0.06);
      }

      .resource-admin-project-filter-grid {
        display: grid;
        max-width: 720px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .resource-admin-filter-field {
        display: flex;
        min-width: 0;
        flex-direction: column;
        gap: 8px;
      }

      .resource-admin-filter-field > span:first-child {
        color: #344054;
        font-size: 13px;
        font-weight: 600;
        line-height: 18px;
      }

      .resource-admin-filter-select-wrap {
        position: relative;
        display: block;
      }

      .resource-admin-filter-select-wrap select {
        width: 100%;
        height: 46px;
        appearance: none;
        border: 1px solid #d0d5dd;
        border-radius: 9px;
        background: #ffffff;
        padding: 0 38px 0 14px;
        color: #344054;
        font-size: 14px;
        box-shadow: 0 1px 2px rgb(16 24 40 / 0.05);
        outline: none;
      }

      .resource-admin-filter-select-wrap select:focus {
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgb(2 132 199 / 0.1);
      }

      .resource-admin-filter-select-wrap svg {
        position: absolute;
        right: 13px;
        top: 50%;
        transform: translateY(-50%);
        color: #667085;
        pointer-events: none;
      }

      .resource-admin-filter-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 16px;
      }

      .resource-admin-clear-filters {
        display: inline-flex;
        min-height: 38px;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border: 1px solid #ef4444;
        border-radius: 8px;
        background: transparent;
        padding: 8px 12px;
        color: #dc2626;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition:
          background-color 0.15s ease,
          color 0.15s ease;
      }

      .resource-admin-clear-filters:hover:not(:disabled) {
        background: #dc2626;
        color: #ffffff;
      }

      .resource-admin-clear-filters:disabled {
        cursor: not-allowed;
        border-color: #98a2b3;
        color: #667085;
        opacity: 0.65;
      }

      .resource-admin-project-list-table {
        width: 100%;
        overflow: hidden;
        border: 1px solid #e4e7ec;
        border-radius: 14px;
        background: #ffffff;
        box-shadow: 0 1px 3px rgb(16 24 40 / 0.05);
      }

      .resource-admin-project-table-scroll {
        width: 100%;
        overflow-x: auto;
      }

      .resource-admin-project-table {
        width: 100%;
        min-width: 1150px;
        table-layout: fixed;
        border-collapse: collapse;
        text-align: left;
      }

      .resource-admin-project-table thead {
        height: 56px;
        background: #f9fafb;
      }

      .resource-admin-project-table th {
        height: 56px;
        padding: 0 18px;
        color: #475467;
        font-family: var(--font-inter), Inter, sans-serif;
        font-size: 13px;
        font-weight: 600;
        line-height: 20px;
        text-align: left;
        vertical-align: middle;
      }

      .resource-admin-project-table tbody tr {
        height: 82px;
        border-bottom: 1px solid #eaecf0;
        background: #ffffff;
      }

      .resource-admin-project-table tbody tr:last-child {
        border-bottom: 0;
      }

      .resource-admin-project-table tbody tr.resource-admin-project-row-alt {
        background: #f5f6f8;
      }

      .resource-admin-project-table tbody tr:hover {
        background: #f8fdff;
      }

      .resource-admin-project-table td {
        height: 82px;
        padding: 0 18px;
        color: #475467;
        font-family: var(--font-inter), Inter, sans-serif;
        font-size: 14px;
        font-weight: 400;
        line-height: 20px;
        vertical-align: middle;
      }

      .resource-admin-col-project {
        width: 270px;
      }

      .resource-admin-col-client {
        width: 190px;
      }

      .resource-admin-col-status {
        width: 180px;
      }

      .resource-admin-col-open {
        width: 135px;
      }

      .resource-admin-col-priority {
        width: 140px;
      }

      .resource-admin-col-team {
        width: 220px;
      }

      .resource-admin-col-updated {
        width: 150px;
      }

      .resource-admin-center {
        text-align: center !important;
      }

      .resource-admin-sort-header {
        display: inline-flex;
        max-width: 100%;
        align-items: center;
        gap: 6px;
        border: 0;
        background: transparent;
        padding: 0;
        color: #475467;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }

      .resource-admin-sort-header-centered {
        width: 100%;
        justify-content: center;
      }

      .resource-admin-sort-header svg {
        flex: none;
        color: #98a2b3;
      }

      .resource-admin-sort-header svg.resource-admin-sort-active {
        color: #344054;
      }

      .resource-admin-project-name {
        display: block;
        overflow: hidden;
        color: #101828;
        font-weight: 600;
        text-decoration: none;
        text-overflow: ellipsis;
        white-space: nowrap;
        transition: color 0.15s ease;
      }

      .resource-admin-project-name:hover {
        color: #0284c7;
      }

      .resource-admin-cell-truncate {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .resource-admin-project-status,
      .resource-admin-project-priority {
        display: inline-flex;
        min-height: 24px;
        min-width: 72px;
        max-width: 142px;
        align-items: center;
        justify-content: center;
        border: 1px solid;
        border-radius: 16px;
        padding: 2px 10px;
        font-family: Inter, var(--font-inter), sans-serif;
        font-size: 12px;
        font-weight: 500;
        line-height: 18px;
        white-space: nowrap;
      }

      .resource-admin-project-status-success,
      .resource-admin-project-priority-low {
        border-color: #abefc6;
        background: #ecfdf3;
        color: #067647;
      }

      .resource-admin-project-status-danger,
      .resource-admin-project-priority-critical {
        border-color: #fecdca;
        background: #fef3f2;
        color: #b42318;
      }

      .resource-admin-project-status-warning,
      .resource-admin-project-priority-high {
        border-color: #fedf89;
        background: #fffaeb;
        color: #b54708;
      }

      .resource-admin-project-status-info,
      .resource-admin-project-priority-medium {
        border-color: #b2ddff;
        background: #eff8ff;
        color: #175cd3;
      }

      .resource-admin-project-priority-not-assigned {
        border-color: #d0d5dd;
        background: #f9fafb;
        color: #475467;
      }

      .resource-admin-team-avatars {
        display: flex;
        min-width: 120px;
        align-items: center;
      }

      .resource-admin-team-avatar,
      .resource-admin-team-more {
        display: grid;
        width: 34px;
        height: 34px;
        place-items: center;
        overflow: hidden;
        margin-left: -8px;
        border: 2px solid #ffffff;
        border-radius: 9999px;
        background: #e6f8fb;
        color: #0284c7;
        font-size: 10px;
        font-weight: 700;
      }

      .resource-admin-team-avatar:first-child {
        margin-left: 0;
      }

      .resource-admin-team-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .resource-admin-team-more {
        background: #f2f4f7;
        color: #475467;
      }

      .resource-admin-muted {
        color: #98a2b3;
      }

      .resource-admin-project-empty-row {
        height: 208px !important;
        text-align: center;
      }

      .resource-admin-project-empty-row > div {
        max-width: 360px;
        margin: 0 auto;
      }

      .resource-admin-project-empty-row strong,
      .resource-admin-project-empty-row span {
        display: block;
      }

      .resource-admin-project-empty-row strong {
        color: #101828;
        font-weight: 600;
      }

      .resource-admin-project-empty-row span {
        margin-top: 4px;
        color: #667085;
        font-size: 14px;
      }

      .resource-admin-project-pagination {
        display: flex;
        min-height: 68px;
        align-items: center;
        justify-content: flex-end;
        gap: 14px;
        border-top: 1px solid #eaecf0;
        background: #ffffff;
        padding: 12px 24px;
        color: #475467;
        font-size: 14px;
      }

      .resource-admin-page-size {
        position: relative;
        display: block;
      }

      .resource-admin-page-size select {
        height: 40px;
        appearance: none;
        border: 1px solid #d0d5dd;
        border-radius: 8px;
        background: #ffffff;
        padding: 0 40px 0 16px;
        color: #344054;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 1px 2px rgb(16 24 40 / 0.05);
        outline: none;
      }

      .resource-admin-page-size select:focus {
        border-color: #0284c7;
      }

      .resource-admin-page-size svg {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #344054;
        pointer-events: none;
      }

      .resource-admin-page-buttons {
        display: flex;
        overflow: hidden;
        border: 1px solid #d0d5dd;
        border-radius: 8px;
        background: #ffffff;
      }

      .resource-admin-page-buttons button {
        display: grid;
        width: 40px;
        height: 40px;
        place-items: center;
        border: 0;
        background: #ffffff;
        color: #344054;
        cursor: pointer;
        transition: background-color 0.15s ease;
      }

      .resource-admin-page-buttons button + button {
        border-left: 1px solid #d0d5dd;
      }

      .resource-admin-page-buttons button:hover:not(:disabled) {
        background: #f9fafb;
      }

      .resource-admin-page-buttons button:disabled {
        cursor: not-allowed;
        opacity: 0.4;
      }

      @media (max-width: 900px) {
        .resource-admin-project-toolbar {
          align-items: stretch;
          flex-direction: column;
        }

        .resource-admin-project-search {
          width: 100%;
          max-width: none;
          margin-left: 0;
        }

        .resource-admin-project-filter-grid {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 640px) {
        .resource-admin-project-pagination {
          align-items: flex-end;
          flex-direction: column;
        }

        .resource-admin-page-size,
        .resource-admin-page-size select {
          width: 100%;
        }
      }
    `}</style>
  );
}
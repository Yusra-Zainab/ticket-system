"use client";

import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { usePageSearch } from "@/components/providers/PageSearchProvider";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { ClientPortalTeamMember } from "@/types/clientPortal";

const pageSizes = [10, 20, 50] as const;

type TeamStatus = "Active" | "Inactive";
type SortKey =
  | "name"
  | "jobTitle"
  | "email"
  | "phone"
  | "addedAt"
  | "status";
type SortDirection = "asc" | "desc";

export default function ClientTeamTable({
  members,
}: {
  members: ClientPortalTeamMember[];
}) {
  const { query, setQuery } = usePageSearch();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [jobTitle, setJobTitle] = useState("All");
  const [status, setStatus] = useState<"All" | TeamStatus>("All");
  const [sort, setSort] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "name",
    direction: "asc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const jobTitles = useMemo(
    () =>
      Array.from(
        new Set(
          members
            .map((member) => member.jobTitle.trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [members],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const rows = members.filter((member) => {
      const matchesSearch =
        !normalizedQuery ||
        [
          member.name,
          member.jobTitle,
          member.email,
          member.phone,
          member.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesJob =
        jobTitle === "All" || member.jobTitle === jobTitle;

      const matchesStatus =
        status === "All" || member.status === status;

      return matchesSearch && matchesJob && matchesStatus;
    });

    return [...rows].sort((a, b) => {
      const left =
        sort.key === "addedAt"
          ? new Date(a.addedAt).getTime() || 0
          : String(a[sort.key] ?? "");

      const right =
        sort.key === "addedAt"
          ? new Date(b.addedAt).getTime() || 0
          : String(b[sort.key] ?? "");

      const comparison =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : String(left).localeCompare(String(right), undefined, {
              numeric: true,
              sensitivity: "base",
            });

      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [members, query, jobTitle, status, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const visibleMembers = filtered.slice(pageStart, pageStart + pageSize);
  const firstItem = filtered.length ? pageStart + 1 : 0;
  const lastItem = Math.min(pageStart + pageSize, filtered.length);
  const hasFilters = jobTitle !== "All" || status !== "All";

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc"
          ? "desc"
          : "asc",
    }));
    setPage(1);
  }

  function clearFilters() {
    setJobTitle("All");
    setStatus("All");
    setPage(1);
  }

  return (
    <div className="client-team-table-root space-y-4">
      <style>{`
        /*
         * The toolbar, filter button, search, frame and pagination use the
         * same Admin ResourcesTable classes from app/globals.css.
         *
         * Only the column geometry is Client Team specific.
         */
        .client-team-table-root .client-team-table {
          width: 100%;
          min-width: 1080px;
          table-layout: fixed;
          border-collapse: collapse;
          text-align: left;
        }

        .client-team-table-root .client-team-table thead {
          height: 44px;
          background: #f9fafb;
        }

        .client-team-table-root .client-team-table thead tr {
          height: 44px;
        }

        .client-team-table-root .client-team-table th {
          height: 44px;
          border-bottom: 1px solid #eaecf0;
          background: #f9fafb;
          padding: 12px 20px;
          color: #475467;
          font-family: var(--font-inter), Inter, sans-serif;
          font-size: 12px;
          font-weight: 600;
          line-height: 18px;
          vertical-align: middle;
        }

        .client-team-table-root .client-team-table tbody tr {
          height: 72px;
          border-bottom: 1px solid #eaecf0;
          background: #ffffff;
        }

        .client-team-table-root .client-team-table tbody tr:nth-child(even) {
          background: #f2f4f7;
        }

        .client-team-table-root .client-team-table tbody tr:hover {
          background: #f9fafb;
        }

        .client-team-table-root .client-team-table td {
          height: 72px;
          padding: 16px 20px;
          color: #475467;
          font-family: var(--font-geist), var(--font-inter), Inter, sans-serif;
          font-size: 14px;
          font-weight: 400;
          line-height: 20px;
          vertical-align: middle;
        }

        .client-team-table-root .client-team-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .client-team-table-root .client-team-table th:nth-child(1),
        .client-team-table-root .client-team-table td:nth-child(1) {
          width: 285px;
          padding-left: 32px;
        }

        .client-team-table-root .client-team-table th:nth-child(2),
        .client-team-table-root .client-team-table td:nth-child(2) {
          width: 210px;
        }

        .client-team-table-root .client-team-table th:nth-child(3),
        .client-team-table-root .client-team-table td:nth-child(3) {
          width: 270px;
        }

        .client-team-table-root .client-team-table th:nth-child(4),
        .client-team-table-root .client-team-table td:nth-child(4) {
          width: 190px;
        }

        .client-team-table-root .client-team-table th:nth-child(5),
        .client-team-table-root .client-team-table td:nth-child(5) {
          width: 170px;
        }

        .client-team-table-root .client-team-table th:nth-child(6),
        .client-team-table-root .client-team-table td:nth-child(6) {
          width: 145px;
          text-align: center;
        }

        .client-team-table-root .client-team-name-cell {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 12px;
        }

        .client-team-table-root .client-team-name-link {
          min-width: 0;
          overflow: hidden;
          color: #101828;
          font-weight: 500;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-decoration: none;
        }

        .client-team-table-root .client-team-name-link:hover {
          color: #0284c7;
        }

        .client-team-table-root .client-team-cell-truncate {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .client-team-table-root .client-team-status {
          display: inline-flex;
          height: 22px;
          min-width: 64px;
          align-items: center;
          justify-content: center;
          border: 1px solid;
          border-radius: 16px;
          padding: 2px 8px;
          font-family: var(--font-geist), Inter, sans-serif;
          font-size: 12px;
          font-weight: 500;
          line-height: 18px;
          white-space: nowrap;
        }

        .client-team-table-root .client-team-status-active {
          border-color: #abefc6;
          background: #ecfdf3;
          color: #067647;
        }

        .client-team-table-root .client-team-status-inactive {
          border-color: #d0d5dd;
          background: #f9fafb;
          color: #475467;
        }

        .client-team-table-root .client-team-filter-menu {
          position: absolute;
          z-index: 50;
          top: calc(100% + 6px);
          left: 0;
          width: 100%;
          min-width: 260px;
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #d0d5dd;
          border-radius: 8px;
          background: #ffffff;
          padding: 6px;
          box-shadow:
            0 12px 28px rgb(16 24 40 / 0.14),
            0 2px 6px rgb(16 24 40 / 0.05);
        }

        .client-team-table-root .client-team-filter-option {
          display: flex;
          width: 100%;
          min-height: 42px;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          padding: 8px 10px;
          color: #344054;
          font-size: 14px;
          text-align: left;
          cursor: pointer;
        }

        .client-team-table-root .client-team-filter-option:hover {
          background: #f9fafb;
        }

        @media (max-width: 900px) {
          .client-team-table-root .client-team-filter-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="resource-toolbar">
        <button
          type="button"
          onClick={() => setFiltersOpen((current) => !current)}
          className={cn(
            "resource-filter-button",
            filtersOpen && "border-[#0284C7] text-[#0284C7]",
          )}
        >
          <Filter size={20} />
          <span>Filters</span>
        </button>

        <label className="resource-search">
          <Search size={20} />
          <span className="sr-only">Search client team</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search"
          />
        </label>
      </div>

      {filtersOpen ? (
        <section className="rounded-[12px] border border-[#EAECF0] bg-[#F9FAFB] p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="client-team-filter-grid grid flex-1 gap-4 md:grid-cols-2">
              <TeamFilterDropdown
                label="Job Title"
                value={jobTitle}
                placeholder="All job titles"
                options={["All", ...jobTitles]}
                onChange={(value) => {
                  setJobTitle(value);
                  setPage(1);
                }}
              />

              <TeamFilterDropdown
                label="Status"
                value={status}
                placeholder="All statuses"
                options={["All", "Active", "Inactive"]}
                onChange={(value) => {
                  setStatus(value as "All" | TeamStatus);
                  setPage(1);
                }}
                renderOption={(value) =>
                  value === "All" ? (
                    <span>All statuses</span>
                  ) : (
                    <TeamStatusBadge status={value as TeamStatus} />
                  )
                }
              />
            </div>

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
      ) : null}

      <div className="resource-table-frame">
        <div className="overflow-x-auto">
          <table className="client-team-table">
            <thead>
              <tr>
                <TeamHeader
                  label="Name"
                  sortKey="name"
                  sort={sort}
                  onSort={toggleSort}
                  align="left"
                />

                <TeamHeader
                  label="Job Title"
                  sortKey="jobTitle"
                  sort={sort}
                  onSort={toggleSort}
                />

                <TeamHeader
                  label="Email"
                  sortKey="email"
                  sort={sort}
                  onSort={toggleSort}
                />

                <TeamHeader
                  label="Phone"
                  sortKey="phone"
                  sort={sort}
                  onSort={toggleSort}
                />

                <TeamHeader
                  label="Added"
                  sortKey="addedAt"
                  sort={sort}
                  onSort={toggleSort}
                />

                <TeamHeader
                  label="Status"
                  sortKey="status"
                  sort={sort}
                  onSort={toggleSort}
                />
              </tr>
            </thead>

            <tbody>
              {visibleMembers.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="client-team-name-cell">
                      <TeamAvatar
                        name={member.name || "Client User"}
                        src={member.avatar}
                      />

                      <Link
                        href={`/client-portal/team/${encodeURIComponent(member.id)}/edit`}
                        className="client-team-name-link"
                        title={`Edit ${member.name}`}
                      >
                        {member.name || "Unnamed Client User"}
                      </Link>
                    </div>
                  </td>

                  <td>
                    <span className="client-team-cell-truncate">
                      {member.jobTitle || "Client User"}
                    </span>
                  </td>

                  <td>
                    <span className="client-team-cell-truncate">
                      {member.email}
                    </span>
                  </td>

                  <td>
                    <span className="client-team-cell-truncate">
                      {member.phone || "No phone"}
                    </span>
                  </td>

                  <td>{formatDate(member.addedAt)}</td>

                  <td>
                    <TeamStatusBadge status={member.status} />
                  </td>
                </tr>
              ))}

              {!visibleMembers.length ? (
                <tr>
                  <td colSpan={6} className="!h-40 text-center">
                    <div className="mx-auto max-w-sm">
                      <p className="font-semibold text-[#101828]">
                        No client team members found
                      </p>
                      <p className="mt-1 text-sm text-[#667085]">
                        Try changing your search or filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <footer className="resource-pagination">
          <span>
            {firstItem} - {lastItem} of {filtered.length}
          </span>

          <div className="relative">
            <select
              aria-label="Team members per page"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="appearance-none pr-9"
            >
              {pageSizes.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#667085]"
            />
          </div>

          <div className="resource-page-buttons">
            <button
              type="button"
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() =>
                setPage(Math.max(1, currentPage - 1))
              }
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
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function TeamAvatar({
  name,
  src,
}: {
  name: string;
  src?: string | null;
}) {
  if (src?.trim()) {
    return (
      <span className="relative inline-flex size-10 shrink-0 overflow-hidden rounded-full bg-[#F2F4F7]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="size-full object-cover" />
        <span className="pointer-events-none absolute inset-0 rounded-full border border-black/[0.08]" />
      </span>
    );
  }

  return <Avatar name={name} className="!size-10 shrink-0" />;
}

function TeamStatusBadge({ status }: { status: TeamStatus }) {
  return (
    <span
      className={cn(
        "client-team-status",
        status === "Active"
          ? "client-team-status-active"
          : "client-team-status-inactive",
      )}
    >
      {status}
    </span>
  );
}

function TeamHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = "center",
}: {
  label: string;
  sortKey: SortKey;
  sort: {
    key: SortKey;
    direction: SortDirection;
  };
  onSort: (key: SortKey) => void;
  align?: "left" | "center";
}) {
  const active = sort.key === sortKey;

  return (
    <th className={align === "left" ? "!text-left" : "!text-center"}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "resource-sort-button",
          align === "left" ? "justify-start" : "justify-center",
        )}
      >
        {label}

        <span className="resource-sort-arrows">
          <ChevronDown
            size={13}
            className={cn(
              "rotate-180",
              active &&
                sort.direction === "asc" &&
                "text-[#0284C7]",
            )}
          />

          <ChevronDown
            size={13}
            className={cn(
              "-mt-[5px]",
              active &&
                sort.direction === "desc" &&
                "text-[#0284C7]",
            )}
          />
        </span>
      </button>
    </th>
  );
}

function TeamFilterDropdown({
  label,
  value,
  placeholder,
  options,
  onChange,
  renderOption,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onChange: (value: string) => void;
  renderOption?: (value: string) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-w-0">
      <span className="mb-1.5 block text-[13px] font-semibold text-[#344054]">
        {label}
      </span>

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-3 rounded-lg border bg-white px-3.5 text-left shadow-[0_1px_2px_rgba(16,24,40,0.05)] outline-none transition",
          open
            ? "border-[#0284C7] ring-[3px] ring-[#0284C7]/10"
            : "border-[#D0D5DD] hover:border-[#98A2B3]",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-sm text-[#344054]">
          {value === "All"
            ? placeholder
            : renderOption
              ? renderOption(value)
              : value}
        </span>

        <ChevronDown
          size={17}
          className={cn(
            "shrink-0 text-[#667085] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label={`Close ${label} filter`}
            onClick={() => setOpen(false)}
          />

          <div
            role="listbox"
            className="client-team-filter-menu"
          >
            {options.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className="client-team-filter-option"
              >
                <span>
                  {renderOption
                    ? renderOption(option)
                    : option === "All"
                      ? placeholder
                      : option}
                </span>

                {option === value ? (
                  <Check size={16} color="#0284c7" />
                ) : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

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

"use client";

import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  X,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { ResourceListRow } from "@/types";

const pageSizes = [10, 20, 50] as const;

const resourceJobTitles = [
  "Backend Developer",
  "Frontend Developer",
  "Full Stack Developer",
  "Software Engineer",
  "Senior Software Engineer",
  "Lead Software Engineer",
  "Principal Software Engineer",

  "React Developer",
  "Next.js Developer",
  "Node.js Developer",
  "PHP Developer",
  "Laravel Developer",
  "Python Developer",
  "Django Developer",
  "Java Developer",
  "Spring Boot Developer",
  ".NET Developer",

  "Mobile App Developer",
  "iOS Developer",
  "Android Developer",
  "Flutter Developer",
  "React Native Developer",

  "DevOps Engineer",
  "Cloud Engineer",
  "AWS Engineer",
  "Azure Engineer",
  "Site Reliability Engineer",
  "Systems Engineer",

  "Database Administrator",
  "Database Engineer",
  "Data Engineer",
  "Data Analyst",
  "Data Scientist",
  "Machine Learning Engineer",
  "AI Engineer",

  "QA Engineer",
  "QA Automation Engineer",
  "Manual QA Engineer",
  "Software Tester",

  "UI Designer",
  "UX Designer",
  "UI/UX Designer",
  "Product Designer",
  "Graphic Designer",
  "Brand Designer",

  "Product Manager",
  "Product Owner",
  "Project Manager",
  "Project Coordinator",
  "Scrum Master",
  "Business Analyst",

  "Technical Lead",
  "Team Lead",
  "Engineering Manager",
  "Solutions Architect",
  "Software Architect",

  "Support Engineer",
  "Technical Support Specialist",
  "Customer Success Manager",

  "SEO Specialist",
  "Digital Marketing Specialist",
  "Content Specialist",

  "Resource Manager",
  "Operations Manager",
  "Administrator",
] as const;

type ResourceTableVariant = "list" | "drafts";

type ResourceStatusType = "Active" | "Inactive";

type SortKey =
  | "name"
  | "jobTitle"
  | "team"
  | "assignedProjects"
  | "activeTickets"
  | "reportingTo"
  | "status";

type SortDirection = "asc" | "desc";

export default function ResourcesTable({
  initialResources,
  variant = "list",
}: {
  initialResources: ResourceListRow[];
  variant?: ResourceTableVariant;
}) {
  const isDrafts = variant === "drafts";

  const [query, setQuery] = useState("");

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [jobTitle, setJobTitle] = useState("All");

  const [status, setStatus] = useState<"All" | ResourceStatusType>("All");

  const [sort, setSort] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "name",
    direction: "asc",
  });

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(10);

  /*
   * Use predefined titles plus any
   * additional titles stored in DB.
   */
  const jobTitles = useMemo(() => {
    const storedTitles = initialResources
      .map((resource) => resource.jobTitle)
      .filter((value): value is string => Boolean(value?.trim()));

    return Array.from(new Set([...resourceJobTitles, ...storedTitles])).sort(
      (a, b) => a.localeCompare(b),
    );
  }, [initialResources]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const rows = initialResources.filter((resource) => {
      /*
       * Draft page intentionally
       * has no search/filter UI.
       */
      const matchesSearch =
        isDrafts ||
        !normalizedQuery ||
        [
          resource.name,
          resource.jobTitle,
          resource.team,
          resource.skills.join(" "),
          resource.reportingTo,
          resource.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesJob =
        isDrafts || jobTitle === "All" || resource.jobTitle === jobTitle;

      const matchesStatus =
        isDrafts || status === "All" || resource.status === status;

      return matchesSearch && matchesJob && matchesStatus;
    });

    return [...rows].sort((a, b) => {
      const aValue = a[sort.key];

      const bValue = b[sort.key];

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sort.direction === "asc" ? aValue - bValue : bValue - aValue;
      }

      const comparison = String(aValue ?? "").localeCompare(
        String(bValue ?? ""),
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        },
      );

      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [initialResources, isDrafts, query, jobTitle, status, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  const currentPage = Math.min(page, pageCount);

  const pageStart = (currentPage - 1) * pageSize;

  const visibleResources = filtered.slice(pageStart, pageStart + pageSize);

  const firstItem = filtered.length > 0 ? pageStart + 1 : 0;

  const lastItem = Math.min(pageStart + pageSize, filtered.length);

  const activeFilterCount = [jobTitle !== "All", status !== "All"].filter(
    Boolean,
  ).length;

  const hasFilters = activeFilterCount > 0;

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));

    setPage(1);
  }

  function clearFilters() {
    setJobTitle("All");
    setStatus("All");
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* =====================================================
          LIST TOOLBAR
          Hidden completely on Resource Drafts.
         ===================================================== */}
      {!isDrafts && (
        <>
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

              {hasFilters}
            </button>

            <label className="resource-search">
              <Search size={20} />

              <span className="sr-only">Search resources</span>

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

          {filtersOpen && (
            <section className="rounded-[12px] border border-[#EAECF0] bg-[#F9FAFB] p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                <div className="grid flex-1 gap-4 md:grid-cols-2">
                  <ResourceFilterDropdown
                    label="Job Title"
                    value={jobTitle}
                    placeholder="All job titles"
                    searchPlaceholder="Search job titles..."
                    options={["All", ...jobTitles]}
                    onChange={(value) => {
                      setJobTitle(value);

                      setPage(1);
                    }}
                    renderOption={(value) =>
                      value === "All" ? (
                        <span className="text-[#344054]">All job titles</span>
                      ) : (
                        <span className="text-[#344054]">{value}</span>
                      )
                    }
                  />

                  <ResourceFilterDropdown
                    label="Status"
                    value={status}
                    placeholder="All statuses"
                    searchPlaceholder="Search status..."
                    options={["All", "Active", "Inactive"]}
                    onChange={(value) => {
                      setStatus(value as "All" | ResourceStatusType);

                      setPage(1);
                    }}
                    renderOption={(value) =>
                      value === "All" ? (
                        <span className="text-[#344054]">All statuses</span>
                      ) : (
                        <ResourceStatus status={value as ResourceStatusType} />
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
          )}
        </>
      )}

      {/* =====================================================
          TABLE
         ===================================================== */}
      <div className="resource-table-frame">
        <div className="overflow-x-auto">
          <table className="resource-table">
            <thead>
              <tr>
                <ResourceHeader
                  label="Resource Name"
                  sortKey="name"
                  sort={sort}
                  onSort={toggleSort}
                  align="left"
                />

                <ResourceHeader
                  label="Job Title"
                  sortKey="jobTitle"
                  sort={sort}
                  onSort={toggleSort}
                />

                <ResourceHeader
                  label="Team"
                  sortKey="team"
                  sort={sort}
                  onSort={toggleSort}
                />

                <th>Skillset</th>

                <ResourceHeader
                  label="Assigned Projects"
                  sortKey="assignedProjects"
                  sort={sort}
                  onSort={toggleSort}
                />

                <ResourceHeader
                  label="Active Tickets"
                  sortKey="activeTickets"
                  sort={sort}
                  onSort={toggleSort}
                />

                <ResourceHeader
                  label="Reporting To"
                  sortKey="reportingTo"
                  sort={sort}
                  onSort={toggleSort}
                />

                <ResourceHeader
                  label="Status"
                  sortKey="status"
                  sort={sort}
                  onSort={toggleSort}
                />
              </tr>
            </thead>

            <tbody>
              {visibleResources.map((resource, index) => (
                <tr
                  key={resource.id}
                  className={cn(index % 2 === 1 && "resource-row-alt")}
                >
                  <td className="resource-name-cell">
                    <ResourceAvatar
                      name={resource.name || "Unnamed Resource"}
                      src={resource.avatar}
                    />

                    <Link
                      href={
                        isDrafts
                          ? `/resources/new?draft=${encodeURIComponent(resource.id)}`
                          : `/resources/${encodeURIComponent(resource.id)}`
                      }
                      className="resource-name-link"
                    >
                      {resource.name || "Untitled Resource"}
                    </Link>
                  </td>

                  <td>{resource.jobTitle || "-"}</td>

                  <td>{resource.team || "-"}</td>

                  <td>
                    <ResourceSkills skills={resource.skills} />
                  </td>

                  <td className="text-center">{resource.assignedProjects}</td>

                  <td className="text-center">{resource.activeTickets}</td>

                  <td>{resource.reportingTo || "-"}</td>

                  <td className="text-center">
                    <ResourceStatus
                      status={normalizeResourceStatus(resource.status)}
                    />
                  </td>
                </tr>
              ))}

              {visibleResources.length === 0 && (
                <tr>
                  <td colSpan={8} className="!h-40 text-center">
                    <div className="mx-auto max-w-sm">
                      <p className="font-semibold text-[#101828]">
                        {isDrafts ? "No resource drafts" : "No resources found"}
                      </p>

                      <p className="mt-1 text-sm text-[#667085]">
                        {isDrafts
                          ? "Saved resource drafts will appear here."
                          : "Try changing your search or filters."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ===================================================
            PAGINATION
           =================================================== */}
        <footer className="resource-pagination">
          <span>
            {firstItem} - {lastItem} of {filtered.length}
          </span>

          <div className="relative">
            <select
              aria-label="Resources per page"
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
              onClick={() => setPage(Math.max(1, currentPage - 1))}
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
        </footer>
      </div>
    </div>
  );
}

/* =========================================================
   RESOURCE AVATAR
   ========================================================= */

/*
 * Your existing Avatar component accepts
 * name/className only.
 *
 * Therefore use a normal image when there
 * is an avatar URL, and Avatar as fallback.
 */
function ResourceAvatar({ name, src }: { name: string; src?: string | null }) {
  if (src && src.trim()) {
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

/* =========================================================
   SKILLS
   ========================================================= */

function ResourceSkills({ skills }: { skills: string[] }) {
  if (!Array.isArray(skills) || skills.length === 0) {
    return <span className="text-[#98A2B3]">-</span>;
  }

  const visible = skills.slice(0, 3);

  const remaining = Math.max(0, skills.length - 3);

  return (
    <div className="resource-skills">
      {visible.map((skill) => (
        <span key={skill}>{skill}</span>
      ))}

      {remaining > 0 && <span>+{remaining}</span>}
    </div>
  );
}

/* =========================================================
   SORTABLE HEADER
   ========================================================= */

function ResourceHeader({
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
    <th className={cn(align === "left" && "!text-left")}>
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
              active && sort.direction === "asc" && "text-[#0284C7]",
            )}
          />

          <ChevronDown
            size={13}
            className={cn(
              "-mt-[5px]",
              active && sort.direction === "desc" && "text-[#0284C7]",
            )}
          />
        </span>
      </button>
    </th>
  );
}

/* =========================================================
   STATUS
   ========================================================= */

function normalizeResourceStatus(value: unknown): ResourceStatusType {
  return String(value ?? "")
    .trim()
    .toLowerCase() === "inactive"
    ? "Inactive"
    : "Active";
}

function ResourceStatus({ status }: { status: ResourceStatusType }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] min-w-[64px] items-center justify-center whitespace-nowrap rounded-[16px] border px-2 text-[12px] font-medium leading-[18px]",

        status === "Active"
          ? "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]"
          : "border-[#D0D5DD] bg-[#F9FAFB] text-[#475467]",
      )}
    >
      {status}
    </span>
  );
}

/* =========================================================
   PROJECT-STYLE FILTER DROPDOWN
   ========================================================= */

function ResourceFilterDropdown({
  label,
  value,
  placeholder,
  searchPlaceholder,
  options,
  onChange,
  renderOption,
}: {
  label: string;
  value: string;
  placeholder: string;
  searchPlaceholder: string;
  options: string[];
  onChange: (value: string) => void;
  renderOption?: (value: string) => ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return options;
    }

    return options.filter((option) =>
      option.toLowerCase().includes(normalized),
    );
  }, [options, search]);

  const selectedContent = value
    ? renderOption
      ? renderOption(value)
      : value
    : placeholder;

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
          {selectedContent}
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
            onClick={() => {
              setOpen(false);
              setSearch("");
            }}
          />

          <div className="absolute left-0 top-[76px] z-40 w-full min-w-[280px] overflow-hidden rounded-[10px] border border-[#EAECF0] bg-white p-2 shadow-[0_12px_28px_rgba(16,24,40,0.14)]">
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
                className="h-10 w-full rounded-lg border border-[#D0D5DD] bg-white pl-9 pr-3 text-sm text-[#344054] outline-none placeholder:text-[#98A2B3] focus:border-[#0284C7] focus:ring-[3px] focus:ring-[#0284C7]/10"
              />
            </label>

            <div className="max-h-[300px] overflow-y-auto">
              {filteredOptions.map((option) => {
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

                      setSearch("");
                    }}
                    className={cn(
                      "flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[7px] px-3 py-2 text-left text-sm transition",

                      selected ? "bg-[#F0F9FF]" : "hover:bg-[#F9FAFB]",
                    )}
                  >
                    <span className="min-w-0">
                      {renderOption ? renderOption(option) : option}
                    </span>

                    {selected && (
                      <Check size={17} className="shrink-0 text-[#0284C7]" />
                    )}
                  </button>
                );
              })}

              {filteredOptions.length === 0 && (
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

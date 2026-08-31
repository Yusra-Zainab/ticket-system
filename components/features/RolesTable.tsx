"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Filter,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import type { RoleRecord, RoleType } from "@/types";

type TypeFilter = "All" | RoleType;

export default function RolesTable({
  initialRoles,
  roleFormHref = "/admin/roles/new",
  allowDelete = false,
}: {
  initialRoles: RoleRecord[];
  roleFormHref?: string;
  allowDelete?: boolean;
}) {
  const router = useRouter();

  const [deleteTarget, setDeleteTarget] = useState<RoleRecord | undefined>();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [query, setQuery] = useState("");

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [type, setType] = useState<TypeFilter>("All");

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return initialRoles.filter((role) => {
      const matchesSearch =
        !search ||
        [
          role.name,
          role.description,
          role.roleType,
          role.type,
          ...role.permissions,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      const matchesType = type === "All" || role.type === type;

      return matchesSearch && matchesType;
    });
  }, [initialRoles, query, type]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  const currentPage = Math.min(page, pageCount);

  const start = (currentPage - 1) * pageSize;

  const visibleRoles = filtered.slice(start, start + pageSize);

  const first = filtered.length ? start + 1 : 0;

  const last = Math.min(start + pageSize, filtered.length);

  const clearFilters = () => {
    setType("All");

    setPage(1);
  };

  async function deleteRole() {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch(
        `/api/roles/${encodeURIComponent(deleteTarget.id)}`,
        { method: "DELETE" },
      );
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Unable to delete role.",
        );
      }

      setDeleteTarget(undefined);
      router.refresh();
    } catch (reason) {
      setDeleteError(
        reason instanceof Error ? reason.message : "Unable to delete role.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setFiltersOpen((current) => !current)}
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg border border-[#D0D5DD] bg-white px-[14px] text-sm font-semibold text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
        >
          <Filter size={18} />
          Filters
        </button>

        <label className="relative w-full sm:max-w-[320px]">
          <Search
            size={20}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#667085]"
          />

          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);

              setPage(1);
            }}
            placeholder="Search"
            className="h-11 w-full rounded-lg border border-[#D0D5DD] bg-white pl-11 pr-4 text-base text-[#344054] outline-none shadow-[0_1px_2px_rgba(16,24,40,0.05)] placeholder:text-[#667085] focus:border-[#0284C7]"
          />
        </label>
      </div>

      {/* Filter panel */}

      {filtersOpen && (
        <div className="rounded-xl border border-[#EAECF0] bg-[#F9FAFB] p-4">
          <div className="grid gap-4 sm:grid-cols-[minmax(220px,320px)_auto] sm:items-end">
            <RoleTypeDropdown
              value={type}
              onChange={(value) => {
                setType(value);

                setPage(1);
              }}
            />

            <button
              type="button"
              disabled={type === "All"}
              onClick={clearFilters}
              className="h-10 justify-self-start rounded-lg border border-red-500 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400 disabled:hover:bg-transparent"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}

      <div className="overflow-hidden rounded-xl border border-[#EAECF0] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead className="bg-[#F9FAFB]">
              <tr className="h-11 border-b border-[#EAECF0]">
                <HeaderCell first>Role Name</HeaderCell>

                <HeaderCell>Description</HeaderCell>

                <HeaderCell>Users</HeaderCell>

                <HeaderCell>Permissions</HeaderCell>

                <HeaderCell>Type</HeaderCell>

                <HeaderCell>Last Updated</HeaderCell>

                {allowDelete && <th className="w-[70px] px-4 py-3" />}
              </tr>
            </thead>

            <tbody>
              {visibleRoles.map((role, index) => (
                <tr
                  key={role.id}
                  className={cn(
                    "h-[72px] border-b border-[#EAECF0] last:border-b-0",

                    index % 2 === 1 && "bg-[#F2F4F7]",
                  )}
                >
                  <td className="px-8 py-4">
                    <Link
                      href={`${roleFormHref}?role=${role.id}`}
                      className="text-sm font-medium text-[#101828] hover:text-[#0284C7]"
                    >
                      {role.name}
                    </Link>
                  </td>

                  <td className="max-w-[260px] px-4 py-4 text-center text-sm leading-5 text-[#475467]">
                    {role.description}
                  </td>

                  <td className="px-4 py-4 text-center text-sm text-[#475467]">
                    {role.users}
                  </td>

                  <td className="px-4 py-4 text-center text-sm text-[#475467]">
                    {role.permissions.length}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <RoleTypeBadge type={role.type} />
                  </td>

                  <td className="px-6 py-4 text-center text-sm text-[#475467]">
                    <DateLabel value={role.updatedAt} />
                  </td>

                  {allowDelete && (
                    <td className="px-3 py-4 text-center">
                      {role.type === "CUSTOM" ? (
                        <button
                          type="button"
                          aria-label={`Delete ${role.name}`}
                          title="Delete role"
                          onClick={() => {
                            setDeleteError("");
                            setDeleteTarget(role);
                          }}
                          className="mx-auto grid size-9 place-items-center rounded-lg text-[#98A2B3] transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={18} />
                        </button>
                      ) : null}
                    </td>
                  )}
                </tr>
              ))}

              {!visibleRoles.length && (
                <tr>
                  <td
                    colSpan={allowDelete ? 7 : 6}
                    className="px-6 py-16 text-center text-sm text-[#667085]"
                  >
                    No roles match this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}

        <div className="flex min-h-[60px] flex-wrap items-center justify-end gap-3 border-t border-[#EAECF0] px-6 py-3">
          <span className="text-xs text-[#475467]">
            {first} - {last} of {filtered.length}
          </span>

          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));

              setPage(1);
            }}
            className="h-9 rounded-lg border border-[#D0D5DD] bg-white px-3 text-sm font-semibold text-[#344054] outline-none"
          >
            <option value={10}>10 per page</option>

            <option value={20}>20 per page</option>

            <option value={50}>50 per page</option>
          </select>

          <div className="flex">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              className="grid size-9 place-items-center rounded-l-lg border border-[#D0D5DD] bg-white text-[#344054] disabled:text-[#D0D5DD]"
            >
              <ArrowLeft size={19} />
            </button>

            <button
              type="button"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
              className="-ml-px grid size-9 place-items-center rounded-r-lg border border-[#D0D5DD] bg-white text-[#344054] disabled:text-[#D0D5DD]"
            >
              <ArrowRight size={19} />
            </button>
          </div>
        </div>
      </div>

      {deleteTarget && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) {
              setDeleteTarget(undefined);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="ticket-modal !w-[420px]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-700">
                  Delete role
                </h2>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Delete <strong>{deleteTarget.name}</strong>? This cannot be
                  undone. Roles still assigned to users can&apos;t be deleted.
                </p>

                {deleteError && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    {deleteError}
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(undefined)}
                className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(undefined)}
                className="button-secondary"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => void deleteRole()}
                className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete role"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeaderCell({
  children,
  first = false,
}: {
  children: React.ReactNode;

  first?: boolean;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-center text-xs font-semibold text-[#475467]",

        first && "px-8 text-left",
      )}
    >
      {children}
    </th>
  );
}

export function RoleTypeBadge({ type }: { type: RoleType }) {
  if (type === "SYSTEM") {
    return (
      <span className="inline-flex h-[22px] items-center rounded-full border border-[#ABEFC6] bg-[#ECFDF3] px-2 text-xs font-medium text-[#067647]">
        System
      </span>
    );
  }

  return (
    <span className="inline-flex h-[22px] items-center rounded-full border border-[#FECDCA] bg-[#FEF3F2] px-2 text-xs font-medium text-[#B42318]">
      Custom
    </span>
  );
}

function RoleTypeDropdown({
  value,
  onChange,
}: {
  value: TypeFilter;

  onChange: (value: TypeFilter) => void;
}) {
  const [open, setOpen] = useState(false);

  const options: TypeFilter[] = ["All", "SYSTEM", "CUSTOM"];

  return (
    <div className="relative">
      <span className="mb-1.5 block text-[13px] font-semibold text-[#344054]">
        Type
      </span>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between rounded-lg border border-[#D0D5DD] bg-white px-3.5 text-sm text-[#344054]"
      >
        {value === "All" ? (
          <span className="text-[#98A2B3]">All types</span>
        ) : (
          <RoleTypeBadge type={value} />
        )}

        <ChevronDown size={17} className="text-[#98A2B3]" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30"
            aria-label="Close type filter"
            onClick={() => setOpen(false)}
          />

          <div className="absolute left-0 top-[76px] z-40 w-full rounded-lg border border-[#EAECF0] bg-white p-2 shadow-lg">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);

                  setOpen(false);
                }}
                className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 hover:bg-[#F9FAFB]"
              >
                {option === "All" ? (
                  <span className="text-sm text-[#344054]">All types</span>
                ) : (
                  <RoleTypeBadge type={option} />
                )}

                {option === value && (
                  <Check size={16} className="text-[#0284C7]" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DateLabel({ value }: { value: string }) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",

    month: "short",

    year: "numeric",
  }).format(date);
}

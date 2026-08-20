"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  UserSquare2,
  X,
} from "lucide-react";

import { type ReactNode, useMemo, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import ClientsTable from "@/components/features/ClientsTable";
import ResourcesTable from "@/components/features/ResourcesTable";

import { cn } from "@/lib/utils";

import type { AdminUserListRow, ClientListRow, ResourceListRow } from "@/types";

type UserTab = "Admins" | "Resources" | "Clients";

type AdminStatus = "Active" | "Inactive";

type SortKey = "name" | "role" | "email" | "addedOn" | "status" | "lastActive";

type SortDirection = "asc" | "desc";

const pageSizes = [10, 20, 50] as const;

const tabs: Array<{
  id: UserTab;
  label: string;
  icon: typeof Shield;
}> = [
  {
    id: "Admins",
    label: "Admins",
    icon: Shield,
  },
  {
    id: "Resources",
    label: "Resources",
    icon: UserSquare2,
  },
  {
    id: "Clients",
    label: "Clients",
    icon: Building2,
  },
];

export default function AdminUsers({
  admins: initialAdmins,
  resources,
  clients,
}: {
  admins: AdminUserListRow[];
  resources: ResourceListRow[];
  clients: ClientListRow[];
}) {
  const router = useRouter();

  const [tab, setTab] = useState<UserTab>("Admins");

  const [admins, setAdmins] = useState<AdminUserListRow[]>(initialAdmins);

  const [query, setQuery] = useState("");

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [role, setRole] = useState("All");

  const [status, setStatus] = useState<"All" | AdminStatus>("All");

  const [sort, setSort] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "lastActive",
    direction: "desc",
  });

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(10);

  const [deleteTarget, setDeleteTarget] = useState<
    AdminUserListRow | undefined
  >();

  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<
    | {
        kind: "success" | "error";
        message: string;
      }
    | undefined
  >();

  /* =====================================================
     DYNAMIC PAGE HEADER
     ===================================================== */

  const pageConfig =
    tab === "Admins"
      ? {
          title: "Users List",
          action: "New Admin",
          href: "/admin/users/new",
        }
      : tab === "Resources"
        ? {
            title: "Resources List",
            action: "New Resource",
            href: "/resources/new",
          }
        : {
            title: "Clients List",
            action: "New Client",
            href: "/clients/new",
          };

  /* =====================================================
     FILTER OPTIONS
     ===================================================== */

  const roles = useMemo(
    () =>
      Array.from(
        new Set(admins.map((admin) => admin.role).filter(Boolean)),
      ).sort((left, right) => left.localeCompare(right)),
    [admins],
  );

  /* =====================================================
     FILTER + SORT
     ===================================================== */

  const filteredAdmins = useMemo(() => {
    const search = query.trim().toLowerCase();

    const rows = admins.filter((admin) => {
      const matchesSearch =
        !search ||
        [admin.name, admin.role, admin.email, admin.status]
          .join(" ")
          .toLowerCase()
          .includes(search);

      const matchesRole = role === "All" || admin.role === role;

      const matchesStatus = status === "All" || admin.status === status;

      return matchesSearch && matchesRole && matchesStatus;
    });

    return [...rows].sort((left, right) => {
      let a: string | number;

      let b: string | number;

      if (sort.key === "addedOn" || sort.key === "lastActive") {
        a = new Date(left[sort.key]).getTime() || 0;

        b = new Date(right[sort.key]).getTime() || 0;
      } else {
        a = String(left[sort.key] ?? "");

        b = String(right[sort.key] ?? "");
      }

      const result =
        typeof a === "number" && typeof b === "number"
          ? a - b
          : String(a).localeCompare(String(b), undefined, {
              numeric: true,
              sensitivity: "base",
            });

      return sort.direction === "asc" ? result : result * -1;
    });
  }, [admins, query, role, status, sort]);

  /* =====================================================
     PAGINATION
     ===================================================== */

  const pageCount = Math.max(1, Math.ceil(filteredAdmins.length / pageSize));

  const currentPage = Math.min(page, pageCount);

  const pageStart = (currentPage - 1) * pageSize;

  const visibleAdmins = filteredAdmins.slice(pageStart, pageStart + pageSize);

  const firstItem = filteredAdmins.length ? pageStart + 1 : 0;

  const lastItem = Math.min(pageStart + pageSize, filteredAdmins.length);

  const hasFilters = role !== "All" || status !== "All";

  function clearFilters() {
    setRole("All");
    setStatus("All");
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

  /* =====================================================
     TAB CHANGE
     ===================================================== */

  function changeTab(nextTab: UserTab) {
    setTab(nextTab);

    setQuery("");
    setRole("All");
    setStatus("All");
    setFiltersOpen(false);
    setPage(1);
  }

  /* =====================================================
     DELETE
     ===================================================== */

  async function deleteAdmin() {
    if (!deleteTarget || deleting) {
      return;
    }

    setDeleting(true);
    setToast(undefined);

    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(deleteTarget.id)}`,
        {
          method: "DELETE",
        },
      );

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Unable to delete user.",
        );
      }

      setAdmins((current) =>
        current.filter((user) => user.id !== deleteTarget.id),
      );

      setToast({
        kind: "success",
        message: `${deleteTarget.name} was deleted successfully.`,
      });

      setDeleteTarget(undefined);

      router.refresh();
    } catch (reason) {
      setToast({
        kind: "error",
        message:
          reason instanceof Error ? reason.message : "Unable to delete user.",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="admin-users-page">
      {/* =================================================
          TITLE + ACTION
         ================================================= */}

      <div className="admin-users-heading-row">
        <h1>{pageConfig.title}</h1>

        <Link href={pageConfig.href} className="admin-users-new-button">
          <Plus size={20} />
          {pageConfig.action}
        </Link>
      </div>

      {/* =================================================
          TABS
         ================================================= */}

      <nav aria-label="User categories" className="admin-users-tabs">
        {tabs.map((item) => {
          const Icon = item.icon;

          const active = tab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => changeTab(item.id)}
              className={cn(
                "admin-users-tab",
                active && "admin-users-tab-active",
              )}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* =================================================
          ADMINS TOOLBAR
          Now sits BELOW tabs
         ================================================= */}

      {tab === "Admins" && (
        <>
          <div className="admin-users-toolbar">
            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              className={cn(
                "admin-users-filter-button",
                filtersOpen && "border-[#0284C7] text-[#0284C7]",
              )}
            >
              <Filter size={20} />
              Filters
            </button>

            <label className="admin-users-search">
              <Search size={20} />

              <span className="sr-only">Search users</span>

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
            <section className="admin-users-filter-panel">
              <div className="admin-users-filter-grid">
                <AdminFilterDropdown
                  label="Role"
                  value={role}
                  placeholder="All roles"
                  searchPlaceholder="Search roles..."
                  options={["All", ...roles]}
                  onChange={(value) => {
                    setRole(value);
                    setPage(1);
                  }}
                />

                <AdminFilterDropdown
                  label="Status"
                  value={status}
                  placeholder="All statuses"
                  searchPlaceholder="Search status..."
                  options={["All", "Active", "Inactive"]}
                  onChange={(value) => {
                    setStatus(value as "All" | AdminStatus);

                    setPage(1);
                  }}
                  renderOption={(value) =>
                    value === "All" ? (
                      <span>All statuses</span>
                    ) : (
                      <AdminStatusBadge status={value as AdminStatus} />
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
        </>
      )}

      {/* =================================================
          ADMINS TABLE
         ================================================= */}

      {tab === "Admins" && (
        <div className="admin-users-table-frame">
          <div className="overflow-x-auto">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <AdminHeader
                    label="Name"
                    sortKey="name"
                    sort={sort}
                    onSort={toggleSort}
                    align="left"
                  />

                  <AdminHeader
                    label="Role"
                    sortKey="role"
                    sort={sort}
                    onSort={toggleSort}
                  />

                  <AdminHeader
                    label="Email"
                    sortKey="email"
                    sort={sort}
                    onSort={toggleSort}
                  />

                  <AdminHeader
                    label="Added On"
                    sortKey="addedOn"
                    sort={sort}
                    onSort={toggleSort}
                  />

                  <AdminHeader
                    label="Status"
                    sortKey="status"
                    sort={sort}
                    onSort={toggleSort}
                  />

                  <AdminHeader
                    label="Last Active"
                    sortKey="lastActive"
                    sort={sort}
                    onSort={toggleSort}
                  />

                  <th className="admin-users-actions-head" />
                </tr>
              </thead>

              <tbody>
                {visibleAdmins.map((admin, index) => (
                  <tr
                    key={admin.id}
                    className={cn(index % 2 === 1 && "admin-users-row-alt")}
                  >
                    <td className="admin-users-name-cell">
                      <UserAvatar name={admin.name} src={admin.avatar} />

                      <Link
                        href={`/admin/users/${admin.id}/edit`}
                        className="admin-users-name-link"
                      >
                        {admin.name}
                      </Link>
                    </td>

                    <td>{admin.role}</td>

                    <td>{admin.email}</td>

                    <td>{formatAdminDate(admin.addedOn)}</td>

                    <td>
                      <AdminStatusBadge status={admin.status} />
                    </td>

                    <td>{formatAdminDate(admin.lastActive)}</td>

                    <td className="admin-users-row-actions">
                      <Link
                        href={`/admin/users/${admin.id}/edit`}
                        aria-label={`Edit ${admin.name}`}
                        title="Edit user"
                        className="admin-users-icon-action"
                      >
                        <Pencil size={20} />
                      </Link>

                      <button
                        type="button"
                        aria-label={`Delete ${admin.name}`}
                        title="Delete user"
                        onClick={() => setDeleteTarget(admin)}
                        className="admin-users-icon-action admin-users-delete-action"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))}

                {!visibleAdmins.length && (
                  <tr>
                    <td colSpan={7} className="admin-users-empty">
                      <strong>No users found</strong>

                      <span>Try changing your search or filters.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* =================================================
              PAGINATION
             ================================================= */}

          <footer className="admin-users-pagination">
            <span>
              {firstItem}
              {" - "}
              {lastItem}
              {" of "}
              {filteredAdmins.length}
            </span>

            <div className="relative">
              <select
                aria-label="Users per page"
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

              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#667085]"
              />
            </div>

            <div className="admin-users-page-buttons">
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
      )}

      {/* =================================================
          RESOURCES
         ================================================= */}

      {tab === "Resources" && <ResourcesTable initialResources={resources} />}

      {/* =================================================
          CLIENTS
         ================================================= */}

      {tab === "Clients" && <ClientsTable initialClients={clients} />}

      {/* =================================================
          DELETE CONFIRMATION
         ================================================= */}

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
            className="ticket-modal !w-[410px]"
          >
            <h2 className="text-2xl font-bold text-slate-700">Confirmation</h2>

            <p className="mt-5 font-semibold text-slate-700">
              Are you sure you want to delete{" "}
              <span className="font-bold">{deleteTarget.name}</span>?
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This user will be removed from the administration users list.
            </p>

            <div className="mt-6 flex justify-between gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(undefined)}
                className="button-secondary !border-cyan-500 !text-sky-600"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => void deleteAdmin()}
                className="min-w-[110px] rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          TOAST
         ================================================= */}

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
          <span>{toast.message}</span>

          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToast(undefined)}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   TABLE HEADER
   ========================================================= */

function AdminHeader({
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
          "admin-users-sort",
          align === "left" ? "justify-start" : "justify-center",
        )}
      >
        {label}

        <span className="grid">
          <ChevronDown
            size={12}
            className={cn(
              "rotate-180",
              active && sort.direction === "asc"
                ? "text-[#0284C7]"
                : "text-[#98A2B3]",
            )}
          />

          <ChevronDown
            size={12}
            className={cn(
              "-mt-[5px]",
              active && sort.direction === "desc"
                ? "text-[#0284C7]"
                : "text-[#98A2B3]",
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

function AdminStatusBadge({ status }: { status: AdminStatus }) {
  return (
    <span
      className={cn(
        "admin-user-status",
        status === "Active"
          ? "admin-user-status-active"
          : "admin-user-status-inactive",
      )}
    >
      {status}
    </span>
  );
}

/* =========================================================
   AVATAR
   ========================================================= */

function UserAvatar({ name, src }: { name: string; src?: string | null }) {
  if (src?.trim()) {
    return (
      <span className="relative size-10 shrink-0 overflow-hidden rounded-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name} className="size-full object-cover" />

        <span className="pointer-events-none absolute inset-0 rounded-full border border-black/[0.08]" />
      </span>
    );
  }

  return <Avatar name={name} className="!size-10" />;
}

/* =========================================================
   FILTER DROPDOWN
   ========================================================= */

function AdminFilterDropdown({
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

  const visible = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return options;
    }

    return options.filter((option) =>
      option.toLowerCase().includes(normalized),
    );
  }, [options, search]);

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

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label={`Close ${label}`}
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
              {visible.map((option) => {
                const selected = option === value;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      onChange(option);

                      setOpen(false);

                      setSearch("");
                    }}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm",
                      selected ? "bg-[#F0F9FF]" : "hover:bg-[#F9FAFB]",
                    )}
                  >
                    <span className="min-w-0 truncate">
                      {option === "All"
                        ? placeholder
                        : renderOption
                          ? renderOption(option)
                          : option}
                    </span>

                    {selected && (
                      <Check size={17} className="shrink-0 text-[#0284C7]" />
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

/* =========================================================
   DATE
   ========================================================= */

function formatAdminDate(value: string) {
  if (!value) {
    return "-";
  }

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

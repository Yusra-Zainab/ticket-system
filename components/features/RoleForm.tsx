"use client";

import { Check, ChevronDown, Loader2, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import StickyToast from "@/components/ui/StickyToast";
import { allPermissions, permissionGroups } from "@/lib/rolePermissions";
import { cn } from "@/lib/utils";

import type { RoleFormRecord, RolePermissionScope } from "@/types";

export default function RoleForm({
  initialRole,
  rolesListHref = "/admin/roles",
}: {
  initialRole?: RoleFormRecord;
  rolesListHref?: string;
}) {
  const router = useRouter();

  const editing = Boolean(initialRole);
  const systemRole = initialRole?.type === "SYSTEM";

  const [name, setName] = useState(initialRole?.name ?? "");
  const [description, setDescription] = useState(
    initialRole?.description ?? "",
  );
  const [roleType, setRoleType] = useState(initialRole?.roleType ?? "");

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    initialRole?.permissions ?? [],
  );

  const [permissionScopes, setPermissionScopes] = useState<
    Record<string, RolePermissionScope>
  >(initialRole?.permissionScopes ?? {});

  const [activeGroup, setActiveGroup] = useState(permissionGroups[0].name);

  const [saving, setSaving] = useState(false);
  const [, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activePermissionGroup = useMemo(
    () =>
      permissionGroups.find((group) => group.name === activeGroup) ??
      permissionGroups[0],
    [activeGroup],
  );

  const activeGroupSelected = activePermissionGroup.permissions.every(
    (permission) => selectedPermissions.includes(permission),
  );

  /*
   * Scope (ALL vs ASSIGNED_ONLY) is only meaningful for the "View"
   * permission of a scoped group — that is what the resource-portal
   * data fetchers read (`getRolePermissionScope`). The toggle reflects
   * and drives that key permission; `setGroupScope` still applies the
   * choice across the whole group so the sub-scopes stay consistent.
   */
  const scopeKeyPermission =
    activePermissionGroup.name === "Projects"
      ? "View Projects"
      : activePermissionGroup.name === "Tickets"
        ? "View Tickets"
        : null;

  const scopedGroup = scopeKeyPermission !== null;

  const activeGroupScope: RolePermissionScope =
    scopeKeyPermission &&
    permissionScopes[scopeKeyPermission] === "ASSIGNED_ONLY"
      ? "ASSIGNED_ONLY"
      : "ALL";

  function togglePermission(permission: string) {
    setSelectedPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  }

  function toggleGroup() {
    const groupPermissions = activePermissionGroup.permissions;

    if (activeGroupSelected) {
      setSelectedPermissions((current) =>
        current.filter((permission) => !groupPermissions.includes(permission)),
      );

      return;
    }

    setSelectedPermissions((current) =>
      Array.from(new Set([...current, ...groupPermissions])),
    );
  }

  function selectAll() {
    setSelectedPermissions(allPermissions);
  }

  function unselectAll() {
    setSelectedPermissions([]);
  }

  function setGroupScope(scope: RolePermissionScope) {
    setPermissionScopes((current) => {
      const next = { ...current };

      for (const permission of activePermissionGroup.permissions) {
        next[permission] = scope;
      }

      return next;
    });
  }

  function reset() {
    setName(initialRole?.name ?? "");
    setDescription(initialRole?.description ?? "");
    setRoleType(initialRole?.roleType ?? "");
    setSelectedPermissions(initialRole?.permissions ?? []);
    setPermissionScopes(initialRole?.permissionScopes ?? {});
    setActiveGroup(permissionGroups[0].name);
    setError("");
    setNotice("");
  }

  async function submit() {
    if (name.trim().length < 3) {
      setError("Enter a role name.");
      setNotice("Enter a role name.");
      return;
    }

    if (!description.trim()) {
      setError("Enter a role description.");
      setNotice("Enter a role description.");
      return;
    }

    if (!roleType.trim()) {
      setError("Enter the role type or position.");
      setNotice("Enter the role type or position.");
      return;
    }

    if (!selectedPermissions.length) {
      setError("Select at least one permission.");
      setNotice("Select at least one permission.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/roles", {
        method: editing ? "PATCH" : "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: initialRole?.id,
          name: name.trim(),
          description: description.trim(),
          roleType: roleType.trim(),
          permissions: selectedPermissions,
          permissionScopes,
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Unable to save role.",
        );
      }

      router.push(rolesListHref);
      router.refresh();
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : "Unable to save role.";
      setError(message);
      setNotice(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* =========================================================
          STICKY PAGE HEADER
         ========================================================= */}

      <div className="sticky top-0 z-30 -mx-1 border-b border-[#EAECF0] bg-white/95 px-1 py-4 backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1
            className="text-[2rem] font-bold tracking-[-0.025em] text-slate-950 sm:text-[2.35rem]"
            style={{
              fontFamily: "var(--font-satoshi), sans-serif",
            }}
          >
            {editing ? initialRole?.name : "Create New Role"}
          </h1>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={reset}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[#D0D5DD] bg-white px-[14px] text-sm font-semibold text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0284C7] via-[#06B6D4] to-[#22D3EE] px-[14px] text-sm font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}

              {editing ? "Save Changes" : "Save and Register"}
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          ROLE INFO
         ========================================================= */}

      <section className="role-form-section">
        <h2 className="role-form-section-title">Role Info</h2>

        <div className="role-info-grid">
          <RoleField label="Role Name">
            <input
              value={name}
              disabled={systemRole}
              onChange={(event) => setName(event.target.value)}
              placeholder="Role's name"
              className="role-field"
            />
          </RoleField>

          <RoleField label="Description">
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Role Description"
              className="role-field"
            />
          </RoleField>

          <RoleField label="Role Type">
            <input
              value={roleType}
              onChange={(event) => setRoleType(event.target.value)}
              placeholder="Role or position."
              className="role-field"
            />
          </RoleField>

          <div />
        </div>

        {systemRole && (
          <p className="role-system-note">
            System role names are protected. Permissions and supporting
            information can still be updated.
          </p>
        )}
      </section>

      {/* =====================================================
          PERMISSIONS
         ===================================================== */}

      <section className="role-form-section">
        <h2 className="role-form-section-title">Permissions</h2>

        <div className="role-permission-toolbar">
          <div className="role-permission-select-wrap">
            <RoleField label="Role">
              <PermissionGroupDropdown
                value={activeGroup}
                onChange={setActiveGroup}
              />
            </RoleField>
          </div>

          <div className="role-permission-buttons">
            <button
              type="button"
              onClick={selectAll}
              className="role-outline-button"
            >
              Select All
            </button>

            <button
              type="button"
              onClick={unselectAll}
              className="role-outline-button"
            >
              Un-Select All
            </button>
          </div>
        </div>

        {activePermissionGroup && (
          <div className="role-permission-tree">
            <div className="flex items-center justify-between gap-4">
              <label className="role-permission-group-row">
                <PermissionCheckbox
                  checked={activeGroupSelected}
                  onChange={toggleGroup}
                />

                <span>{activePermissionGroup.name}</span>
              </label>

              {scopedGroup && (
                <div
                  role="radiogroup"
                  aria-label={`${activePermissionGroup.name} data access scope`}
                  className="inline-flex shrink-0 overflow-hidden rounded-lg border border-[#06B6D4]"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={activeGroupScope === "ALL"}
                    onClick={() => setGroupScope("ALL")}
                    className={cn(
                      "h-8 px-3.5 text-xs font-semibold transition-colors",
                      activeGroupScope === "ALL"
                        ? "bg-[#0284C7] text-white"
                        : "bg-white text-[#0284C7] hover:bg-[#F0F9FF]",
                    )}
                  >
                    All
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={activeGroupScope === "ASSIGNED_ONLY"}
                    onClick={() => setGroupScope("ASSIGNED_ONLY")}
                    className={cn(
                      "h-8 border-l border-[#06B6D4] px-3.5 text-xs font-semibold transition-colors",
                      activeGroupScope === "ASSIGNED_ONLY"
                        ? "bg-[#0284C7] text-white"
                        : "bg-white text-[#0284C7] hover:bg-[#F0F9FF]",
                    )}
                  >
                    Assigned only
                  </button>
                </div>
              )}
            </div>

            <div className="role-permission-items">
              {activePermissionGroup.permissions.map((permission) => (
                <label key={permission} className="role-permission-item">
                  <PermissionCheckbox
                    checked={selectedPermissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                  />

                  <span>{permission}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      {notice && (
        <StickyToast
          message={notice}
          kind="error"
          onDismiss={() => {
            setNotice("");
            setError("");
          }}
        />
      )}
    </div>
  );
}

function RoleField({
  label,
  children,
}: {
  label: string;

  children: React.ReactNode;
}) {
  return (
    <label className="role-form-field">
      <span className="role-form-label">{label}</span>

      {children}
    </label>
  );
}

function PermissionCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;

  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        "role-checkbox",

        checked && "role-checkbox-checked",
      )}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </button>
  );
}

function PermissionGroupDropdown({
  value,
  onChange,
}: {
  value: string;

  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="role-dropdown">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "role-dropdown-trigger",

          open && "role-dropdown-trigger-open",
        )}
      >
        <span>{value}</span>

        <ChevronDown
          size={20}
          className={cn(
            "role-dropdown-chevron",

            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close role dropdown"
            onClick={() => setOpen(false)}
          />

          <div className="role-dropdown-menu">
            {permissionGroups.map((group) => (
              <button
                key={group.name}
                type="button"
                onClick={() => {
                  onChange(group.name);

                  setOpen(false);
                }}
                className={cn(
                  "role-dropdown-option",

                  value === group.name && "role-dropdown-option-selected",
                )}
              >
                <span>{group.name}</span>

                {value === group.name && (
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

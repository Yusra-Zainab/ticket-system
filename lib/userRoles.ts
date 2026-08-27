/* =========================================================
   USER ROLE CLASSIFICATION

   DATABASE ROLE VALUES

   ADMIN:
   - admin
   - superadmin

   CLIENT:
   - client
   - client_team

   RESOURCE:
   - every other non-empty role
   ========================================================= */

export type PortalKind =
  | "admin"
  | "client"
  | "resource";

/* =========================================================
   NORMALIZE
   ========================================================= */

export function normalizeUserRole(
  role: string | null | undefined,
): string {
  const normalized = String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");

  /*
   * Canonical DB value for Super Admin
   * is exactly:
   *
   * superadmin
   */
  switch (normalized) {
    case "super_admin":
    case "superadmin":
      return "superadmin";

    case "clientuser":
    case "client_user":
      return "client";

    case "clientteam":
    case "clientteammember":
    case "client_team_member":
      return "client_team";

    default:
      return normalized;
  }
}

/* =========================================================
   FORM JOB TITLE -> DATABASE ROLE
   ========================================================= */

export function roleFromJobTitle(
  jobTitle: string | null | undefined,
): string {
  const value = String(jobTitle ?? "")
    .trim();

  const normalized = value
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");

  /*
   * IMPORTANT:
   *
   * Super Admin from the form MUST become:
   *
   * users.role = "superadmin"
   */
  if (
    normalized === "super_admin" ||
    normalized === "superadmin"
  ) {
    return "superadmin";
  }

  if (normalized === "admin") {
    return "admin";
  }

  if (
    normalized === "client" ||
    normalized === "client_user"
  ) {
    return "client";
  }

  if (
    normalized === "client_team" ||
    normalized === "client_team_member"
  ) {
    return "client_team";
  }

  return normalized;
}

/* =========================================================
   ADMIN
   ========================================================= */

export function isAdminRole(
  role: string | null | undefined,
): boolean {
  const normalized =
    normalizeUserRole(role);

  return (
    normalized === "admin" ||
    normalized === "superadmin"
  );
}

/* =========================================================
   CLIENT
   ========================================================= */

export function isClientRole(
  role: string | null | undefined,
): boolean {
  const normalized =
    normalizeUserRole(role);

  return (
    normalized === "client" ||
    normalized === "client_team"
  );
}

/* =========================================================
   RESOURCE
   ========================================================= */

export function isResourceRole(
  role: string | null | undefined,
): boolean {
  const normalized =
    normalizeUserRole(role);

  if (!normalized) {
    return false;
  }

  return (
    !isAdminRole(normalized) &&
    !isClientRole(normalized)
  );
}

/* =========================================================
   PORTAL
   ========================================================= */

export function portalForRole(
  role: string | null | undefined,
): PortalKind | null {
  const normalized =
    normalizeUserRole(role);

  if (!normalized) {
    return null;
  }

  if (isAdminRole(normalized)) {
    return "admin";
  }

  if (isClientRole(normalized)) {
    return "client";
  }

  return "resource";
}

/* =========================================================
   PORTAL HOME
   ========================================================= */

export function portalHomeForRole(
  role: string | null | undefined,
): string {
  const portal =
    portalForRole(role);

  if (portal === "admin") {
    return "/dashboard";
  }

  if (portal === "client") {
    return "/client-portal/dashboard";
  }

  if (portal === "resource") {
    return "/resource-portal/dashboard";
  }

  return "/login";
}

/* =========================================================
   DISPLAY
   ========================================================= */

export function formatUserRole(
  role: string | null | undefined,
): string {
  const normalized =
    normalizeUserRole(role);

  if (!normalized) {
    return "";
  }

  if (normalized === "superadmin") {
    return "Super Admin";
  }

  return normalized
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}

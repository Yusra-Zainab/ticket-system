import { NextRequest, NextResponse } from "next/server";

import {
  getProxySessionUser,
  isAdminRole,
  isClientRole,
  isResourceRole,
  portalHomeForRole,
} from "@/lib/auth";
import { getRolePermissions } from "@/lib/db";

const publicPrefixes = [
  "/login",
  "/forgotPassword",
  "/resetPassword",
  "/reset-password",
  "/api/auth/",
  "/_next/",
  "/favicon.ico",
];

const adminPagePrefixes = [
  "/admin",
  "/projects",
  "/tickets",
  "/clients",
  "/resources",
  "/profile",
  "/notifications",
  "/modules",
  "/submodules",
];

const adminApiPrefixes = [
  "/api/projects",
  "/api/tickets",
  "/api/clients",
  "/api/resources",
  "/api/profile",
  "/api/users",
  "/api/roles",
  "/api/settings",
  "/api/attachments",
  "/api/project-attachments",
];

function projectApiPermission(pathname: string, method: string) {
  const upper = method.toUpperCase();

  if (pathname === "/api/projects") {
    if (upper === "GET") return "View Projects";
    if (upper === "POST") return "Create Projects";
    return null;
  }

  if (/^\/api\/projects\/[^/]+\/attachments$/.test(pathname)) {
    if (upper === "POST") return "Manage Project Files";
    return null;
  }

  if (/^\/api\/project-attachments\/[^/]+$/.test(pathname)) {
    if (upper === "GET") return "View Projects";
    if (upper === "DELETE") return "Manage Project Files";
    return null;
  }

  if (/^\/api\/projects\/[^/]+$/.test(pathname)) {
    if (upper === "GET") return "View Projects";
    if (upper === "PATCH") return "Edit Projects";
    if (upper === "DELETE") return "Delete Projects";
  }

  return null;
}

function ticketApiPermission(pathname: string, method: string) {
  const upper = method.toUpperCase();

  if (pathname === "/api/tickets") {
    if (upper === "GET") return "View Tickets";
    if (upper === "POST") return "Create Tickets";
    return null;
  }

  if (/^\/api\/tickets\/[^/]+\/attachments$/.test(pathname)) {
    if (upper === "GET") return "View Tickets";
    if (upper === "POST") return "View Tickets";
    return null;
  }

  if (/^\/api\/tickets\/[^/]+$/.test(pathname)) {
    if (upper === "GET") return "View Tickets";
    if (upper === "DELETE") return "Delete Tickets";
    if (upper === "PATCH") {
      return [
        "Edit Tickets",
        "Assign Tickets",
        "Change Ticket Status",
        "Change Ticket Priority",
        "View Tickets",
      ];
    }
  }

  return null;
}

function resourceApiPermission(
  pathname: string,
  method: string,
): string | string[] | null {
  const upper = method.toUpperCase();

  if (pathname === "/api/resources") {
    if (upper === "GET") return "View Resources";
    /*
     * POST handles both create and edit (payload carries an id when
     * editing). The route handler enforces the precise permission;
     * here we only need to let either capability through.
     */
    if (upper === "POST") {
      return ["Create Resources", "Edit Resources", "Assign Resources"];
    }
    return null;
  }

  return null;
}

function clientApiPermission(
  pathname: string,
  method: string,
): string | string[] | null {
  const upper = method.toUpperCase();

  if (pathname === "/api/clients") {
    if (upper === "GET") return "View Clients";
    if (upper === "POST") return "Create Clients";
    return null;
  }

  if (/^\/api\/clients\/[^/]+$/.test(pathname)) {
    if (upper === "GET") return "View Clients";
    if (upper === "PATCH") return "Edit Clients";
    if (upper === "DELETE") return "Delete Clients";
  }

  return null;
}

function roleApiPermission(
  pathname: string,
  method: string,
): string | string[] | null {
  const upper = method.toUpperCase();

  if (pathname === "/api/roles") {
    if (upper === "GET") return "View Roles";
    if (upper === "POST") return "Create Roles";
    if (upper === "PATCH") return "Edit Roles";
    if (upper === "DELETE") return "Delete Custom Roles";
    return null;
  }

  if (/^\/api\/roles\/[^/]+$/.test(pathname)) {
    if (upper === "GET") return "View Roles";
    if (upper === "DELETE") return "Delete Custom Roles";
    return null;
  }

  return null;
}

function settingsApiPermission(
  pathname: string,
  method: string,
): string | string[] | null {
  const upper = method.toUpperCase();

  if (pathname === "/api/settings/email") {
    if (upper === "GET") return "Configure Email";
    if (upper === "PATCH") return "Configure Email";
    return null;
  }

  return null;
}

function jsonUnauthorized(status: 401 | 403, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const isClientPortalRoute =
    pathname.startsWith("/client-portal") ||
    pathname.startsWith("/api/client-portal");

  const isResourcePortalRoute =
    pathname.startsWith("/resource-portal") ||
    pathname.startsWith("/api/resource-portal");

  // /dashboard is intentionally shared. The server page routes a valid session
  // to the correct portal after login and password reset.
  const needsSession =
    pathname === "/dashboard" ||
    isClientPortalRoute ||
    isResourcePortalRoute ||
    adminPagePrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    adminApiPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!needsSession) {
    return NextResponse.next();
  }

  const user = await getProxySessionUser(request);

  if (!user) {
    if (pathname.startsWith("/api/")) {
      return jsonUnauthorized(401, "Authentication required.");
    }

    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (isClientPortalRoute) {
    if (!isClientRole(user.role)) {
      if (pathname.startsWith("/api/")) {
        return jsonUnauthorized(403, "Client portal access required.");
      }
      return NextResponse.redirect(new URL(portalHomeForRole(user.role), request.url));
    }
    return NextResponse.next();
  }

  if (isResourcePortalRoute) {
    if (!isResourceRole(user.role)) {
      if (pathname.startsWith("/api/")) {
        return jsonUnauthorized(403, "Resource portal access required.");
      }
      return NextResponse.redirect(new URL(portalHomeForRole(user.role), request.url));
    }
    return NextResponse.next();
  }

  /*
   * Client-portal accounts have their own `/api/client-portal/*` surface and
   * never belong on an admin page or admin API — not even where they hold a
   * permission that shares a name with admin's (the "Client User" system role
   * carries "View Tickets" / "View Projects", which previously let a client
   * call `GET /api/tickets` or `/api/projects` and read every tenant's data,
   * including internal ticket notes — F22). Resource-portal accounts are
   * deliberately *not* blocked here: the resource portal reuses the admin API
   * routes by design and is gated by the per-permission maps below.
   */
  if (isClientRole(user.role)) {
    if (pathname.startsWith("/api/")) {
      return jsonUnauthorized(403, "Client portal access required.");
    }
    return NextResponse.redirect(
      new URL(portalHomeForRole(user.role), request.url),
    );
  }

  const projectApiPermissionName = projectApiPermission(pathname, request.method);

  if (projectApiPermissionName) {
    const permissions = await getRolePermissions(user.role);

    if (!permissions.includes(projectApiPermissionName)) {
      return jsonUnauthorized(403, "Permission denied.");
    }

    return NextResponse.next();
  }

  const resourceApiPermissionName = resourceApiPermission(pathname, request.method);

  if (resourceApiPermissionName) {
    const permissions = await getRolePermissions(user.role);
    const required = Array.isArray(resourceApiPermissionName)
      ? resourceApiPermissionName
      : [resourceApiPermissionName];

    if (!required.some((permission) => permissions.includes(permission))) {
      return jsonUnauthorized(403, "Permission denied.");
    }

    return NextResponse.next();
  }

  const clientApiPermissionName = clientApiPermission(pathname, request.method);

  if (clientApiPermissionName) {
    const permissions = await getRolePermissions(user.role);
    const required = Array.isArray(clientApiPermissionName)
      ? clientApiPermissionName
      : [clientApiPermissionName];

    if (!required.some((permission) => permissions.includes(permission))) {
      return jsonUnauthorized(403, "Permission denied.");
    }

    return NextResponse.next();
  }

  const ticketApiPermissionName = ticketApiPermission(pathname, request.method);

  if (ticketApiPermissionName) {
    const permissions = await getRolePermissions(user.role);
    const required = Array.isArray(ticketApiPermissionName)
      ? ticketApiPermissionName
      : [ticketApiPermissionName];

    if (!required.some((permission) => permissions.includes(permission))) {
      return jsonUnauthorized(403, "Permission denied.");
    }

    return NextResponse.next();
  }

  const roleApiPermissionName = roleApiPermission(pathname, request.method);

  if (roleApiPermissionName) {
    const permissions = await getRolePermissions(user.role);
    const required = Array.isArray(roleApiPermissionName)
      ? roleApiPermissionName
      : [roleApiPermissionName];

    if (!required.some((permission) => permissions.includes(permission))) {
      return jsonUnauthorized(403, "Permission denied.");
    }

    return NextResponse.next();
  }

  const settingsApiPermissionName = settingsApiPermission(
    pathname,
    request.method,
  );

  if (settingsApiPermissionName) {
    const permissions = await getRolePermissions(user.role);
    const required = Array.isArray(settingsApiPermissionName)
      ? settingsApiPermissionName
      : [settingsApiPermissionName];

    if (!required.some((permission) => permissions.includes(permission))) {
      return jsonUnauthorized(403, "Permission denied.");
    }

    return NextResponse.next();
  }

  if (pathname === "/dashboard") {
    return NextResponse.next();
  }

  if (!isAdminRole(user.role)) {
    if (pathname.startsWith("/api/")) {
      return jsonUnauthorized(403, "Administrator access required.");
    }
    return NextResponse.redirect(new URL(portalHomeForRole(user.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};


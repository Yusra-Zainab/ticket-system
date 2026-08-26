import { NextRequest, NextResponse } from "next/server";

import {
  getProxySessionUser,
  isAdminRole,
  isClientRole,
  isResourceRole,
  portalHomeForRole,
} from "@/lib/auth";

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

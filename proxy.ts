import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ensureAuthInfrastructure, getProxySessionUser } from "@/lib/auth";

const publicRoutes = ["/login", "/forgotPassword", "/resetPassword"];
const publicApiRoutes = ["/api/auth/login", "/api/auth/forgot-password", "/api/auth/reset-password", "/api/health"];

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/fonts/") ||
    pathname === "/favicon.ico"
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (publicApiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  try {
    await ensureAuthInfrastructure();
    const user = await getProxySessionUser(request);

    if (user) {
      return NextResponse.next();
    }
  } catch {
    // Fall through to login redirect / auth error.
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

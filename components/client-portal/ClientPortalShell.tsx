"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Home,
  RotateCw,
} from "lucide-react";
import { useState } from "react";

import ClientNotificationsProvider from "@/components/providers/ClientNotificationsProvider";
import { PageSearchProvider } from "@/components/providers/PageSearchProvider";
import type { ClientPortalNotification } from "@/types/clientPortal";
import ClientFloatingActionBar from "@/components/client-portal/ClientFloatingActionBar";

type Crumb = {
  label: string;
  href?: string;
};

function buildClientCrumbs(pathname: string): Crumb[] {
  if (pathname === "/client-portal/dashboard") {
    return [{ label: "Dashboard" }];
  }

  if (pathname === "/client-portal/projects") {
    return [{ label: "Projects" }];
  }

  if (
    pathname.startsWith("/client-portal/projects/") &&
    pathname.split("/").filter(Boolean).length === 3
  ) {
    return [
      { label: "Projects", href: "/client-portal/projects" },
      { label: "..." },
      { label: "Project Details" },
    ];
  }

  if (pathname === "/client-portal/tickets") {
    return [{ label: "Tickets" }];
  }

  if (pathname === "/client-portal/tickets/new") {
    return [
      { label: "Tickets", href: "/client-portal/tickets" },
      { label: "..." },
      { label: "Create Ticket" },
    ];
  }

  if (pathname === "/client-portal/tickets/drafts") {
    return [
      { label: "Tickets", href: "/client-portal/tickets" },
      { label: "..." },
      { label: "Ticket Drafts" },
    ];
  }

  if (
    pathname.startsWith("/client-portal/tickets/") &&
    pathname.split("/").filter(Boolean).length === 3
  ) {
    return [
      { label: "Tickets", href: "/client-portal/tickets" },
      { label: "..." },
      { label: "Ticket Details" },
    ];
  }

  if (pathname === "/client-portal/team") {
    return [{ label: "Team" }];
  }

  if (pathname === "/client-portal/team/new") {
    return [
      { label: "Team", href: "/client-portal/team" },
      { label: "..." },
      { label: "Add Team Member" },
    ];
  }

  if (pathname === "/client-portal/notifications") {
    return [{ label: "Notifications" }];
  }

  if (pathname === "/client-portal/profile") {
    return [{ label: "Profile" }];
  }

  if (pathname === "/client-portal/profile/edit") {
    return [
      { label: "Profile", href: "/client-portal/profile" },
      { label: "..." },
      { label: "Settings" },
    ];
  }

  const parts = pathname
    .replace(/^\/client-portal\/?/, "")
    .split("/")
    .filter(Boolean);

  return parts.map((part, index) => ({
    label: part
      .replace(/-/g, " ")
      .replace(/^./, (letter) => letter.toUpperCase()),
    href:
      index < parts.length - 1
        ? `/client-portal/${parts.slice(0, index + 1).join("/")}`
        : undefined,
  }));
}

function ClientPortalShellInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const crumbs = buildClientCrumbs(pathname);

  return (
    <PageSearchProvider key={pathname}>
      <div className="min-h-screen bg-white">
        {/*
          Same shell structure used by the Admin AppLayout:
          shared max width, gutters, breadcrumb controls,
          searchable main content and floating action bar.
        */}
        <div className="mx-auto max-w-[1800px] px-5 pb-36 pt-7 sm:px-8 lg:px-12 xl:px-16">
          <nav
            aria-label="Breadcrumbs"
            className="mb-7 flex min-h-12 items-center gap-2.5 rounded-lg border-b border-[#0284C7]/10 px-3 py-2 text-sm font-semibold text-[#0284C7]"
          >
            <Link
              href="/client-portal/dashboard"
              aria-label="Client dashboard"
              className="crumb-button text-sky-600"
            >
              <Home size={17} />
            </Link>

            {crumbs.map((crumb) => (
              <span
                className="flex items-center gap-2.5"
                key={`${crumb.label}-${crumb.href ?? "current"}`}
              >
                <ChevronRight size={15} className="text-[#0284C7]" />

                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="rounded-lg px-2 py-1.5 text-sky-600 hover:bg-sky-50"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="rounded-lg bg-sky-50 px-3 py-2 text-sky-600">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}

            <span className="ml-2 flex overflow-hidden rounded-lg bg-sky-50 text-sky-600">
              <button
                type="button"
                aria-label="Go back"
                onClick={() => router.back()}
                className="crumb-button"
              >
                <ArrowLeft size={17} />
              </button>

              <button
                type="button"
                aria-label="Go forward"
                onClick={() => router.forward()}
                className="crumb-button border-l border-white"
              >
                <ArrowRight size={17} />
              </button>
            </span>

            <button
              type="button"
              aria-label="Refresh"
              disabled={isRefreshing}
              onClick={() => {
                setIsRefreshing(true);
                router.refresh();

                window.setTimeout(() => {
                  setIsRefreshing(false);
                }, 1500);
              }}
              className="crumb-button ml-1 text-[#0284C7]"
            >
              <RotateCw
                size={17}
                className={isRefreshing ? "animate-spin" : ""}
              />
            </button>
          </nav>

          <main data-page-search-content>{children}</main>
        </div>

        <ClientFloatingActionBar />
      </div>
    </PageSearchProvider>
  );
}

export default function ClientPortalShell({
  children,
  notifications,
  notificationReadStorageKey,
}: {
  children: React.ReactNode;
  userName?: string;
  notifications: ClientPortalNotification[];
  notificationReadStorageKey: string;
}) {
  return (
    <ClientNotificationsProvider
      items={notifications}
      storageKey={notificationReadStorageKey}
    >
      <ClientPortalShellInner>
        {children}
      </ClientPortalShellInner>
    </ClientNotificationsProvider>
  );
}
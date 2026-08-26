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

import { PageSearchProvider } from "@/components/providers/PageSearchProvider";
import ResourceNotificationsProvider from "@/components/providers/ResourceNotificationsProvider";
import ResourceFloatingActionBar from "@/components/resource-portal/ResourceFloatingActionBar";
import ResourceNotificationStyles from "@/components/resource-portal/ResourceNotificationStyles";
import type { ResourcePortalNotification } from "@/types/resourcePortal";

type ResourceCrumb = {
  label: string;
  href?: string;
};

function buildResourceCrumbs(pathname: string): ResourceCrumb[] {
  /*
   * Match the admin dashboard behaviour: the dashboard itself only
   * shows the home button plus browser history / refresh controls.
   */
  if (pathname === "/resource" || pathname === "/resource-portal/dashboard") {
    return [];
  }

  /* Projects */
  if (pathname === "/resource-portal/projects") {
    return [{ label: "Projects" }];
  }

  if (
    pathname.startsWith("/resource-portal/projects/") &&
    pathname.split("/").filter(Boolean).length === 3
  ) {
    return [
      { label: "Projects", href: "/resource-portal/projects" },
      { label: "..." },
      { label: "Project Details" },
    ];
  }

  /* Tickets */
  if (pathname === "/resource-portal/tickets") {
    return [{ label: "Tickets" }];
  }

  if (pathname === "/resource-portal/tickets/drafts") {
    return [
      { label: "Tickets", href: "/resource-portal/tickets" },
      { label: "..." },
      { label: "Ticket Drafts" },
    ];
  }

  if (pathname === "/resource-portal/tickets/new") {
    return [
      { label: "Tickets", href: "/resource-portal/tickets" },
      { label: "..." },
      { label: "Create Ticket" },
    ];
  }

  if (
    pathname.startsWith("/resource-portal/tickets/") &&
    pathname.split("/").filter(Boolean).length === 3
  ) {
    return [
      { label: "Tickets", href: "/resource-portal/tickets" },
      { label: "..." },
      { label: "Ticket Details" },
    ];
  }

  /* Notifications */
  if (pathname === "/resource-portal/notifications") {
    return [{ label: "Notifications" }];
  }

  /* Profile */
  if (pathname === "/resource-portal/profile") {
    return [{ label: "Resource Details" }];
  }

  if (pathname === "/resource-portal/profile/edit") {
    return [
      { label: "Resource Details", href: "/resource-portal/profile" },
      { label: "..." },
      { label: "Edit Resource" },
    ];
  }

  /*
   * Resource-scoped fallback. The leading /resource segment is not
   * shown, the same way the admin layout handles its route prefix.
   */
  const parts = pathname
    .split("/")
    .filter(Boolean)
    .filter((part) => part !== "resource");

  return parts.map((part, index) => {
    const isLast = index === parts.length - 1;
    const label = part
      .replace(/-/g, " ")
      .replace(/^./, (letter) => letter.toUpperCase());

    return {
      label,
      href: isLast
        ? undefined
        : `/resource-portal/${parts.slice(0, index + 1).join("/")}`,
    };
  });
}

export default function ResourcePortalShell({
  children,
  notifications,
  notificationReadStorageKey,
}: {
  children: React.ReactNode;
  notifications: ResourcePortalNotification[];
  notificationReadStorageKey: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const crumbs = buildResourceCrumbs(pathname);

  return (
    <PageSearchProvider key={pathname}>
      <ResourceNotificationsProvider
        items={notifications}
        storageKey={notificationReadStorageKey}
      >
        <div className="resource-portal-shell">
          <ResourceNotificationStyles />
        <div className="resource-portal-frame">
          <nav
            aria-label="Breadcrumbs"
            className="resource-shell-breadcrumbs"
          >
            <Link
              href="/resource-portal/dashboard"
              aria-label="Resource dashboard"
              title="Dashboard"
              className="resource-shell-home"
            >
              <Home size={17} />
            </Link>

            {crumbs.map((crumb, index) => (
              <span
                className="resource-shell-crumb"
                key={`${crumb.label}-${crumb.href ?? "current"}-${index}`}
              >
                <ChevronRight
                  size={15}
                  className="resource-shell-chevron"
                />

                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="resource-shell-crumb-link"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="resource-shell-crumb-current">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}

            <span className="resource-shell-history">
              <button
                type="button"
                aria-label="Go back"
                title="Back"
                onClick={() => router.back()}
                className="resource-shell-history-button"
              >
                <ArrowLeft size={17} />
              </button>

              <button
                type="button"
                aria-label="Go forward"
                title="Forward"
                onClick={() => router.forward()}
                className="resource-shell-history-button"
              >
                <ArrowRight size={17} />
              </button>
            </span>

            <button
              type="button"
              aria-label="Refresh"
              title="Refresh"
              disabled={isRefreshing}
              className="resource-shell-refresh-button"
              onClick={() => {
                setIsRefreshing(true);
                router.refresh();
                window.setTimeout(() => setIsRefreshing(false), 1500);
              }}
            >
              <RotateCw
                size={17}
                className={isRefreshing ? "resource-shell-refreshing" : ""}
              />
            </button>
          </nav>

          <main className="resource-portal-main" data-page-search-content>
            {children}
          </main>
        </div>

          <ResourceFloatingActionBar />
        </div>
      </ResourceNotificationsProvider>
    </PageSearchProvider>
  );
}
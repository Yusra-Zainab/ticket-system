
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

import { AppProvider, useApp } from "@/components/providers/AppProvider";
import { PageSearchProvider } from "@/components/providers/PageSearchProvider";
import FloatingActionBar from "./FloatingActionBar";
import { useNavHistory } from "./useNavHistory";

export interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  notifications?: import("@/types").Notification[];
  notificationStorageKey?: string;
}

const bareRoutes = [
  "/login",
  "/forgotPassword",
  "/resetPassword",
  "/reset-password",
  "/errors",
  "/client-portal",
  "/resource-portal",
];

function buildCrumbs(
  pathname: string,
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>,
) {
  if (breadcrumbs) {
    return breadcrumbs;
  }

  /* =====================================================
     PROJECTS
     ===================================================== */

  if (pathname === "/projects/new") {
    return [
      {
        label: "Projects",
        href: "/projects",
      },
      {
        label: "...",
        href: undefined,
      },
      {
        label: "New Project",
        href: undefined,
      },
    ];
  }

  if (
    pathname.startsWith("/projects/") &&
    pathname.split("/").filter(Boolean).length === 2
  ) {
    return [
      {
        label: "Projects",
        href: "/projects",
      },
      {
        label: "...",
        href: undefined,
      },
      {
        label: "Project Details",
        href: undefined,
      },
    ];
  }

  if (
    pathname.startsWith("/projects/") &&
    pathname.split("/").filter(Boolean).length === 3 &&
    pathname.endsWith("/edit")
  ) {
    return [
      {
        label: "Projects",
        href: "/projects",
      },
      {
        label: "...",
        href: undefined,
      },
      {
        label: "Edit Project",
        href: undefined,
      },
    ];
  }

  /* =====================================================
     TICKETS
     ===================================================== */

  if (pathname === "/tickets/drafts") {
    return [
      {
        label: "Tickets",
        href: "/tickets",
      },
      {
        label: "...",
        href: undefined,
      },
      {
        label: "Ticket Drafts",
        href: undefined,
      },
    ];
  }

  if (pathname === "/tickets/new") {
    return [
      {
        label: "Tickets",
        href: "/tickets",
      },
      {
        label: "...",
        href: undefined,
      },
      {
        label: "Create Ticket",
        href: undefined,
      },
    ];
  }

  /* =====================================================
     ADMINISTRATION
     Hide the /admin segment from breadcrumbs.
     ===================================================== */

  if (pathname.startsWith("/admin")) {
    const parts = pathname.split("/").filter(Boolean);

    return parts.map((part, index) => {
      const isLast = index === parts.length - 1;

      let label = part
        .replace(/-/g, " ")
        .replace(/^./, (letter) => letter.toUpperCase());

      if (part === "admin") {
        label = "Admin";
      }

      if (part === "users") {
        label = "Users";
      }

      if (part === "roles") {
        label = "Roles";
      }

      if (
        part === "email" ||
        part === "email-settings" ||
        part === "email-configuration"
      ) {
        label = "Email Account Settings";
      }

      if (part === "new") {
        const parent = parts[index - 1];

        if (parent === "users") {
          label = "New User";
        } else if (parent === "roles") {
          label = "New Role";
        } else {
          label = "New";
        }
      }

      /*
       * Admin and Settings should appear
       * as plain/current-style text,
       * never as clickable links.
       */
      if (part === "admin" || part === "settings") {
        return {
          label,
          href: undefined,
        };
      }

      return {
        label,
        href: !isLast ? `/${parts.slice(0, index + 1).join("/")}` : undefined,
      };

      return {
        label,
        href: !isLast ? `/${parts.slice(0, index + 1).join("/")}` : undefined,
      };
    });
  }

  /* =====================================================
     GENERIC FALLBACK
     ===================================================== */

  const parts = pathname.split("/").filter(Boolean);

  return parts.map((part, index) => ({
    label:
      part === "new"
        ? `New ${parts[index - 1]?.replace(/s$/, "") ?? ""}`
        : part
            .replace(/-/g, " ")
            .replace(/^./, (letter) => letter.toUpperCase()),

    href:
      index < parts.length - 1
        ? `/${parts.slice(0, index + 1).join("/")}`
        : undefined,
  }));
}

function Shell({ children, breadcrumbs }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { canBack, canForward } = useNavHistory();
  const { unreadCount } = useApp();

  if (bareRoutes.some((route) => pathname.startsWith(route))) {
    return <>{children}</>;
  }

  const crumbs = buildCrumbs(pathname, breadcrumbs);

  return (
    <PageSearchProvider key={pathname}>
      <div className="min-h-screen bg-white">
        <div className="w-full px-8 pb-24 pt-8">
          <nav
            aria-label="Breadcrumbs"
            className="mb-7 flex min-h-12 items-center gap-2.5 border-b border-[#0284C7]/10 px-5 py-2 text-sm font-semibold text-[#0284C7]"
          >
            <Link
              href="/"
              aria-label="Dashboard"
              className="crumb-button text-[#0284C7]"
            >
              <Home size={16} />
            </Link>

            {crumbs.map((crumb) => (
              <span
                className="flex items-center gap-2.5"
                key={`${crumb.label}-${crumb.href ?? "current"}`}
              >
                <ChevronRight size={16} className="text-[#0284C7]" />
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="rounded-lg px-2.5 py-1.5 text-[#0284C7] hover:bg-[#F0F9FF]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="rounded-lg bg-[#F0F9FF] px-2.5 py-1.5 text-[#0284C7]">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}

            <span className="ml-2 flex overflow-hidden rounded-lg">
              <button
                aria-label="Go back"
                onClick={() => router.back()}
                disabled={!canBack}
                className="crumb-button disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft size={16} />
              </button>
              <button
                aria-label="Go forward"
                onClick={() => router.forward()}
                disabled={!canForward}
                className="crumb-button border-l border-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowRight size={16} />
              </button>
            </span>

            <button
              aria-label="Refresh"
              disabled={isRefreshing}
              onClick={() => {
                setIsRefreshing(true);
                router.refresh();
                window.setTimeout(() => setIsRefreshing(false), 1500);
              }}
              className="crumb-button ml-1 text-[#0284C7]"
            >
              <RotateCw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
            </button>
          </nav>

          <main data-page-search-content>{children}</main>
        </div>

        <FloatingActionBar notificationsCount={unreadCount} />
      </div>
    </PageSearchProvider>
  );
}

export default function AppLayout(props: AppLayoutProps) {
  return (
    <AppProvider
      initialNotifications={props.notifications ?? []}
      notificationStorageKey={props.notificationStorageKey}
    >
      <Shell {...props} />
    </AppProvider>
  );
}

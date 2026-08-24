"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Bell,
  BriefcaseBusiness,
  CheckSquare2,
  Contact,
  LayoutDashboard,
  List,
  LogOut,
  Mail,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Undo2,
  UserRound,
  UsersRound,
} from "lucide-react";

import { useState } from "react";

import NotificationPopover from "@/components/ui/NotificationPopover";
import { usePageSearch } from "@/components/providers/PageSearchProvider";
import { cn } from "@/lib/utils";

export interface FloatingActionBarProps {
  notificationsCount: number;
}

type FeatureKey =
  | "tickets"
  | "projects"
  | "resources"
  | "clients"
  | "administration";

type FeatureConfig = {
  label: string;
  href: string;
  createHref?: string;
  listHref?: string;
  icon: typeof CheckSquare2;
};

const featureConfig: Record<FeatureKey, FeatureConfig> = {
  tickets: {
    label: "Tickets",
    href: "/tickets",
    createHref: "/tickets/new",
    listHref: "/tickets",
    icon: CheckSquare2,
  },

  projects: {
    label: "Projects",
    href: "/projects",
    createHref: "/projects/new",
    listHref: "/projects",
    icon: BriefcaseBusiness,
  },

  resources: {
    label: "Resources",
    href: "/resources",
    createHref: "/resources/new",
    listHref: "/resources",
    icon: UsersRound,
  },

  clients: {
    label: "Clients",
    href: "/clients",
    createHref: "/clients/new",
    listHref: "/clients",
    icon: Contact,
  },

  administration: {
    label: "Administration",
    href: "/admin/users",
    icon: SlidersHorizontal,
  },
};

function getFeatureFromPath(pathname: string): FeatureKey | null {
  if (pathname.startsWith("/tickets")) {
    return "tickets";
  }

  if (pathname.startsWith("/projects")) {
    return "projects";
  }

  if (pathname.startsWith("/resources")) {
    return "resources";
  }

  if (pathname.startsWith("/clients")) {
    return "clients";
  }

  if (pathname.startsWith("/admin")) {
    return "administration";
  }

  return null;
}

export default function FloatingActionBar({
  notificationsCount,
}: FloatingActionBarProps) {
  const pathname = usePathname();

  const router = useRouter();

  const [activeFeature, setActiveFeature] = useState<FeatureKey | null>(null);

  const [accountOpen, setAccountOpen] = useState(false);

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [searching, setSearching] = useState(false);
  const { query: searchValue, setQuery, clearQuery, matchState } =
    usePageSearch();
  const notificationsLabel =
    notificationsCount > 0
      ? `Notifications (${notificationsCount > 99 ? "99+" : notificationsCount} new)`
      : "No new notifications";

  const dashboardActive = pathname === "/dashboard";

  /*
   * SEARCH MODE
   */
  if (searching) {
    return (
      <nav
        aria-label="Page search"
        className="floating-dock floating-search-mode"
      >
        <span className="dock-search-active">
          <Search size={24} />
        </span>

        <input
          autoFocus
          type="search"
          value={searchValue}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          aria-label="Search current page"
          aria-invalid={matchState === "not-found"}
          className={cn(
            "dock-search-input",
            matchState === "not-found" && "dock-search-input-not-found",
          )}
        />

        <span className="dock-divider" />

        <button
          type="button"
          aria-label="Back to navigation"
          title="Back"
          onClick={() => {
            setSearching(false);
            clearQuery();
          }}
          className="dock-action"
        >
          <Undo2 size={22} />
        </button>
      </nav>
    );
  }

  /*
   * ACCOUNT MINI BAR
   */
  if (accountOpen) {
    return (
      <nav
        aria-label="Account actions"
        className="floating-dock floating-feature-mode"
      >
        <button
          type="button"
          aria-label="Search current page"
          title="Search"
          onClick={() => {
            setNotificationsOpen(false);

            setSearching(true);
          }}
          className="dock-action"
        >
          <Search size={22} />
        </button>

        <span className="dock-divider" />

        <span
          aria-label="Profile"
          title="Profile"
          className="dock-action dock-action-active"
        >
          <UserRound size={22} />
        </span>

        <Link
          href="/profile"
          aria-label="Profile settings"
          title="Profile settings"
          className="dock-action"
        >
          <Settings size={22} />
        </Link>

        <button
          type="button"
          aria-label="Logout"
          title="Logout"
          onClick={async () => {
            await fetch("/api/auth/logout", {
              method: "POST",
            });
            router.push("/login");
            router.refresh();
          }}
          className="dock-action"
        >
          <LogOut size={22} />
        </button>

        <span className="dock-divider" />

        <button
          type="button"
          aria-label="Back to full navigation"
          title="Back"
          onClick={() => setAccountOpen(false)}
          className="dock-action"
        >
          <Undo2 size={22} />
        </button>
      </nav>
    );
  }

  /*
   * ADMINISTRATION MINI BAR
   *
   * Search
   * |
   * Administration active
   * Users
   * Roles
   * Email configuration
   * |
   * Back
   */
  if (activeFeature === "administration") {
    return (
      <nav
        aria-label="Administration actions"
        className="floating-dock floating-feature-mode"
      >
        <button
          type="button"
          aria-label="Search current page"
          title="Search"
          onClick={() => {
            setNotificationsOpen(false);

            setSearching(true);
          }}
          className="dock-action"
        >
          <Search size={22} />
        </button>

        <span className="dock-divider" />

        {/* Selected Administration module */}
        <span
          aria-label="Administration"
          title="Administration"
          className="dock-action dock-action-active"
        >
          <SlidersHorizontal size={22} />
        </span>

        {/* Users */}
        <Link
          href="/admin/users"
          aria-label="Users"
          title="Users"
          className={cn(
            "dock-action",

            pathname.startsWith("/admin/users") && "dock-action-active",
          )}
        >
          <UsersRound size={22} />
        </Link>

        {/* Roles */}
        <Link
          href="/admin/roles"
          aria-label="Roles and permissions"
          title="Roles and permissions"
          className={cn(
            "dock-action",

            pathname.startsWith("/admin/roles") && "dock-action-active",
          )}
        >
          <ShieldCheck size={22} />
        </Link>

        {/* Email configuration */}
        <Link
          href="/admin/settings/email"
          aria-label="Email account settings"
          title="Email account settings"
          className={cn(
            "dock-action",

            pathname.startsWith("/admin/settings/email") &&
              "dock-action-active",
          )}
        >
          <Mail size={22} />
        </Link>

        <span className="dock-divider" />

        <button
          type="button"
          aria-label="Back to full navigation"
          title="Back"
          onClick={() => setActiveFeature(null)}
          className="dock-action"
        >
          <Undo2 size={22} />
        </button>
      </nav>
    );
  }

  /*
   * NORMAL FEATURE MINI BAR
   */
  if (activeFeature) {
    const config = featureConfig[activeFeature];

    const FeatureIcon = config.icon;

    return (
      <nav
        aria-label={`${config.label} actions`}
        className="floating-dock floating-feature-mode"
      >
        <button
          type="button"
          aria-label="Search current page"
          title="Search"
          onClick={() => {
            setNotificationsOpen(false);

            setSearching(true);
          }}
          className="dock-action"
        >
          <Search size={22} />
        </button>

        <span className="dock-divider" />

        <span
          aria-label={config.label}
          title={config.label}
          className="dock-action dock-action-active"
        >
          <FeatureIcon size={22} />
        </span>

        {config.createHref && (
          <Link
            href={config.createHref}
            aria-label={`Create ${config.label}`}
            title={`Create ${config.label}`}
            className="dock-action"
          >
            <Plus size={23} />
          </Link>
        )}

        {config.listHref && (
          <Link
            href={config.listHref}
            aria-label={`${config.label} list`}
            title={`${config.label} list`}
            className="dock-action"
          >
            <List size={22} />
          </Link>
        )}

        <span className="dock-divider" />

        <button
          type="button"
          aria-label="Back to full navigation"
          title="Back"
          onClick={() => setActiveFeature(null)}
          className="dock-action"
        >
          <Undo2 size={22} />
        </button>
      </nav>
    );
  }

  /*
   * FULL BAR
   */
  return (
    <>
      {notificationsOpen && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="notification-popover-dismiss"
            onClick={() => setNotificationsOpen(false)}
          />

          <NotificationPopover onClose={() => setNotificationsOpen(false)} />
        </>
      )}

      <nav
        aria-label="Quick navigation"
        className="floating-dock floating-full-mode"
      >
        <button
          type="button"
          aria-label="Search current page"
          title="Search"
          onClick={() => {
            setNotificationsOpen(false);

            setAccountOpen(false);

            setSearching(true);
          }}
          className="dock-action"
        >
          <Search size={22} />
        </button>

        <span className="dock-divider" />

        <Link
          href="/"
          aria-label="Dashboard"
          title="Dashboard"
          aria-current={dashboardActive ? "page" : undefined}
          onClick={() => {
            setNotificationsOpen(false);
            setAccountOpen(false);
            setActiveFeature(null);
          }}
          className={cn(
            "dock-action",
            dashboardActive && "dock-action-active !bg-[#0284C7] !text-white",
          )}
        >
          <LayoutDashboard
            size={22}
            className={cn(dashboardActive && "!text-white")}
          />
        </Link>

        <FeatureNavButton
          feature="tickets"
          pathname={pathname}
          onSelect={(feature) => {
            setNotificationsOpen(false);

            setAccountOpen(false);

            setActiveFeature(feature);
          }}
        />

        <FeatureNavButton
          feature="projects"
          pathname={pathname}
          onSelect={(feature) => {
            setNotificationsOpen(false);

            setAccountOpen(false);

            setActiveFeature(feature);
          }}
        />

        <FeatureNavButton
          feature="resources"
          pathname={pathname}
          onSelect={(feature) => {
            setNotificationsOpen(false);

            setAccountOpen(false);

            setActiveFeature(feature);
          }}
        />

        <FeatureNavButton
          feature="clients"
          pathname={pathname}
          onSelect={(feature) => {
            setNotificationsOpen(false);

            setAccountOpen(false);

            setActiveFeature(feature);
          }}
        />

        <FeatureNavButton
          feature="administration"
          pathname={pathname}
          onSelect={(feature) => {
            setNotificationsOpen(false);

            setAccountOpen(false);

            setActiveFeature(feature);
          }}
        />

        <span className="dock-divider" />

        <button
          type="button"
          aria-label={notificationsLabel}
          title={notificationsLabel}
          aria-expanded={notificationsOpen}
          aria-controls="notification-popover"
          onClick={() => {
            setAccountOpen(false);

            setActiveFeature(null);

            setNotificationsOpen((current) => !current);
          }}
          className={cn(
            "dock-action relative",

            (notificationsOpen || pathname.startsWith("/notifications")) &&
              "dock-action-active",
          )}
        >
          <Bell size={22} />

          {notificationsCount > 0 && (
            <span className="notification-count">
              {notificationsCount > 99 ? "99+" : notificationsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          aria-label="Account"
          title="Account"
          onClick={() => {
            setNotificationsOpen(false);

            setActiveFeature(null);

            setAccountOpen(true);
          }}
          className={cn(
            "dock-action",

            (pathname.startsWith("/profile") ||
              pathname.startsWith("/settings")) &&
              "dock-action-active",
          )}
        >
          <UserRound size={22} />
        </button>
      </nav>
    </>
  );
}

function FeatureNavButton({
  feature,
  pathname,
  onSelect,
}: {
  feature: FeatureKey;

  pathname: string;

  onSelect: (feature: FeatureKey) => void;
}) {
  const config = featureConfig[feature];

  const Icon = config.icon;

  const active = getFeatureFromPath(pathname) === feature;

  return (
    <button
      type="button"
      aria-label={config.label}
      title={config.label}
      onClick={() => onSelect(feature)}
      className={cn(
        "dock-action",

        active && "dock-action-active",
      )}
    >
      <Icon size={22} />
    </button>
  );
}

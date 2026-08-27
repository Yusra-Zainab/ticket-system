"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  CheckSquare2,
  FileText,
  Gauge,
  List,
  LogOut,
  Plus,
  Search,
  Settings,
  Undo2,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import ClientNotificationPopover from "@/components/client-portal/ClientNotificationPopover";
import { useClientNotifications } from "@/components/providers/ClientNotificationsProvider";
import { usePageSearch } from "@/components/providers/PageSearchProvider";
import { cn } from "@/lib/utils";

type ClientFeatureKey = "projects" | "tickets" | "team";

type FeatureConfig = {
  label: string;
  icon: LucideIcon;
  listHref: string;
  createHref?: string;
  createLabel?: string;
  draftsHref?: string;
  draftsLabel?: string;
};

const featureConfig: Record<ClientFeatureKey, FeatureConfig> = {
  projects: {
    label: "Projects",
    icon: BriefcaseBusiness,
    listHref: "/client-portal/projects",
  },

  tickets: {
    label: "Tickets",
    icon: CheckSquare2,
    listHref: "/client-portal/tickets",
    createHref: "/client-portal/tickets/new",
    createLabel: "Create Ticket",
    draftsHref: "/client-portal/tickets/drafts",
    draftsLabel: "Ticket Drafts",
  },

  team: {
    label: "Team",
    icon: UsersRound,
    listHref: "/client-portal/team",
    createHref: "/client-portal/team/new",
    createLabel: "Add Team Member",
  },
};

function getFeatureFromPath(pathname: string): ClientFeatureKey | null {
  if (pathname.startsWith("/client-portal/projects")) return "projects";
  if (pathname.startsWith("/client-portal/tickets")) return "tickets";
  if (pathname.startsWith("/client-portal/team")) return "team";

  return null;
}

export default function ClientFloatingActionBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [activeFeature, setActiveFeature] =
    useState<ClientFeatureKey | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const {
    unreadCount: notificationsCount,
  } = useClientNotifications();

  const {
    query: searchValue,
    setQuery,
    clearQuery,
    matchState,
  } = usePageSearch();

  const dashboardActive = pathname === "/client-portal/dashboard";
  const notificationsActive = pathname.startsWith(
    "/client-portal/notifications",
  );
  const profileActive = pathname.startsWith("/client-portal/profile");

  const notificationsLabel =
    notificationsCount > 0
      ? `Notifications (${notificationsCount > 99 ? "99+" : notificationsCount} new)`
      : "Notifications";

  function openSearch() {
    setNotificationsOpen(false);
    setActiveFeature(null);
    setAccountOpen(false);
    setSearching(true);
  }

  function closeSearch() {
    clearQuery();
    setSearching(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.replace("/login");
    router.refresh();
  }

  /*
   * SEARCH MODE
   * Exact Admin global floating-dock classes.
   */
  if (searching) {
    return (
      <nav
        aria-label="Client page search"
        className="floating-dock floating-search-mode"
      >
        <span className="dock-search-active" aria-hidden="true">
          <Search size={24} />
        </span>

        <input
          autoFocus
          type="search"
          value={searchValue}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeSearch();
            }
          }}
          placeholder="Search"
          aria-label="Search current page"
          className={cn(
            "dock-search-input",
            matchState === "not-found" && "dock-search-input-not-found",
          )}
        />

        <span className="dock-divider" />

        <button
          type="button"
          aria-label="Back to client navigation"
          title="Back"
          onClick={closeSearch}
          className="dock-action"
        >
          <Undo2 size={22} />
        </button>
      </nav>
    );
  }

  /*
   * PROFILE MINI BAR
   * Search | Profile(active) Settings Logout | Back
   */
  if (accountOpen) {
    return (
      <nav
        aria-label="Client account actions"
        className="floating-dock floating-feature-mode"
      >
        <button
          type="button"
          aria-label="Search current page"
          title="Search"
          onClick={openSearch}
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
          href="/client-portal/profile"
          aria-label="Profile settings"
          title="Profile settings"
          className={cn(
            "dock-action",
            pathname.startsWith("/client-portal/profile") &&
              "dock-action-active",
          )}
        >
          <Settings size={22} />
        </Link>

        <button
          type="button"
          aria-label="Logout"
          title="Logout"
          onClick={() => void logout()}
          className="dock-action-logout"
        >
          <LogOut size={22} />
        </button>

        <span className="dock-divider" />

        <button
          type="button"
          aria-label="Back to full client navigation"
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
   * FEATURE MINI BARS
   *
   * Projects: Search | Projects(active) List | Back
   * Tickets:  Search | Tickets(active) Create Drafts List | Back
   * Team:     Search | Team(active) Add List | Back
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
          onClick={openSearch}
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

        {config.createHref ? (
          <Link
            href={config.createHref}
            aria-label={config.createLabel ?? `Create ${config.label}`}
            title={config.createLabel ?? `Create ${config.label}`}
            className={cn(
              "dock-action",
              pathname === config.createHref && "dock-action-active",
            )}
          >
            <Plus size={23} />
          </Link>
        ) : null}

        {config.draftsHref ? (
          <Link
            href={config.draftsHref}
            aria-label={config.draftsLabel ?? "Drafts"}
            title={config.draftsLabel ?? "Drafts"}
            className={cn(
              "dock-action",
              pathname.startsWith(config.draftsHref) &&
                "dock-action-active",
            )}
          >
            <FileText size={22} />
          </Link>
        ) : null}

        <Link
          href={config.listHref}
          aria-label={`${config.label} list`}
          title={`${config.label} list`}
          className={cn(
            "dock-action",
            pathname === config.listHref && "dock-action-active",
          )}
        >
          <List size={22} />
        </Link>

        <span className="dock-divider" />

        <button
          type="button"
          aria-label="Back to full client navigation"
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
   * FULL CLIENT BAR
   * Search | Projects Tickets Team | Notifications Profile
   */
  return (
    <>
      {notificationsOpen ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="notification-popover-dismiss"
            onClick={() =>
              setNotificationsOpen(false)
            }
          />

          <ClientNotificationPopover
            onClose={() =>
              setNotificationsOpen(false)
            }
          />
        </>
      ) : null}

      <nav
        aria-label="Client portal quick navigation"
        className="floating-dock floating-full-mode"
      >
      <button
        type="button"
        aria-label="Search current page"
        title="Search"
        onClick={openSearch}
        className="dock-action"
      >
        <Search size={22} />
      </button>

      <span className="dock-divider" />

      <Link
        href="/client-portal/dashboard"
        aria-label="Dashboard"
        title="Dashboard"
        aria-current={dashboardActive ? "page" : undefined}
        onClick={() => {
          setNotificationsOpen(false);
          setActiveFeature(null);
          setAccountOpen(false);
        }}
        className={cn(
          "dock-action",
          dashboardActive && "dock-action-active",
        )}
      >
        <Gauge size={22} />
      </Link>

      <ClientFeatureButton
        feature="projects"
        pathname={pathname}
        onSelect={(feature) => {
          setNotificationsOpen(false);
          setAccountOpen(false);
          setActiveFeature(feature);
        }}
      />

      <ClientFeatureButton
        feature="tickets"
        pathname={pathname}
        onSelect={(feature) => {
          setNotificationsOpen(false);
          setAccountOpen(false);
          setActiveFeature(feature);
        }}
      />

      <ClientFeatureButton
        feature="team"
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
          setNotificationsOpen(
            (current) => !current,
          );
        }}
        className={cn(
          "dock-action relative",
          (notificationsOpen ||
            notificationsActive) &&
            "dock-action-active",
        )}
      >
        <Bell size={22} />

        {notificationsCount > 0 ? (
          <span className="notification-count">
            {notificationsCount > 99
              ? "99+"
              : notificationsCount}
          </span>
        ) : null}
      </button>

      <button
        type="button"
        aria-label="Profile"
        title="Profile"
        aria-expanded={accountOpen}
        onClick={() => {
          setNotificationsOpen(false);
          setActiveFeature(null);
          setAccountOpen(true);
        }}
        className={cn(
          "dock-action",
          profileActive && "dock-action-active",
        )}
      >
        <UserRound size={22} />
      </button>
      </nav>
    </>
  );
}

function ClientFeatureButton({
  feature,
  pathname,
  onSelect,
}: {
  feature: ClientFeatureKey;
  pathname: string;
  onSelect: (feature: ClientFeatureKey) => void;
}) {
  const config = featureConfig[feature];
  const Icon = config.icon;
  const active = getFeatureFromPath(pathname) === feature;

  return (
    <button
      type="button"
      aria-label={config.label}
      title={config.label}
      aria-current={active ? "page" : undefined}
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

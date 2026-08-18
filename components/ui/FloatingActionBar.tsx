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
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Undo2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useState } from "react";

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
    listHref: "/admin/users",
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

  const [searching, setSearching] = useState(false);

  const [searchValue, setSearchValue] = useState("");

  /*
   * SEARCH MODE
   *
   * Search is local to the currently open page.
   * This value should later be connected to your
   * local page search/filter state.
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
          onChange={(event) => setSearchValue(event.target.value)}
          placeholder="Search"
          aria-label="Search current page"
          className="dock-search-input"
        />

        <span className="dock-divider" />

        <button
          type="button"
          aria-label="Back to navigation"
          title="Back"
          onClick={() => {
            setSearching(false);
            setSearchValue("");
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
   *
   * Search | Account | Settings | Logout | Back
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
          onClick={() => setSearching(true)}
          className="dock-action"
        >
          <Search size={22} />
        </button>

        <span className="dock-divider" />

        <Link
          href="/profile"
          aria-label="Account"
          title="Account"
          className={cn(
            "dock-action dock-action-active",
            pathname.startsWith("/profile") && "dock-action-active",
          )}
        >
          <UserRound size={22} />
        </Link>

        <Link
          href="/settings"
          aria-label="Settings"
          title="Settings"
          className={cn(
            "dock-action",
            pathname.startsWith("/settings") && "dock-action-active",
          )}
        >
          <Settings size={22} />
        </Link>

        <button
          type="button"
          aria-label="Logout"
          title="Logout"
          onClick={() => {
            /*
             * Replace this with your real auth
             * logout action if your app uses one.
             *
             * Example:
             * await signOut();
             *
             * For now this sends the user to
             * the logout route.
             */
            router.push("/logout");
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
   * FEATURE MINI BAR
   *
   * Search | active feature | + | list | Back
   *
   * Administration does not currently have a
   * create action, so it only shows:
   *
   * Search | Administration | List | Back
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
          onClick={() => setSearching(true)}
          className="dock-action"
        >
          <Search size={22} />
        </button>

        <span className="dock-divider" />

        {/* Selected feature: visual only, no navigation */}
        <span
          aria-label={config.label}
          title={config.label}
          className="dock-action dock-action-active"
        >
          <FeatureIcon size={22} />
        </span>

        {/* Create */}
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

        {/* List */}
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

        {/* Back to full dock */}
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
   * FULL / DEFAULT BAR
   *
   * Search
   * |
   * Dashboard
   * Tickets
   * Projects
   * Resources
   * Clients
   * Administration
   * |
   * Notifications
   * Account
   */
  return (
    <nav
      aria-label="Quick navigation"
      className="floating-dock floating-full-mode"
    >
      <button
        type="button"
        aria-label="Search current page"
        title="Search"
        onClick={() => setSearching(true)}
        className="dock-action"
      >
        <Search size={22} />
      </button>

      <span className="dock-divider" />

      <Link
        href="/"
        aria-label="Dashboard"
        title="Dashboard"
        className={cn("dock-action", pathname === "/" && "dock-action-active")}
      >
        <LayoutDashboard size={22} />
      </Link>

      <FeatureNavButton
        feature="tickets"
        pathname={pathname}
        onSelect={setActiveFeature}
      />

      <FeatureNavButton
        feature="projects"
        pathname={pathname}
        onSelect={setActiveFeature}
      />

      <FeatureNavButton
        feature="resources"
        pathname={pathname}
        onSelect={setActiveFeature}
      />

      <FeatureNavButton
        feature="clients"
        pathname={pathname}
        onSelect={setActiveFeature}
      />

      <FeatureNavButton
        feature="administration"
        pathname={pathname}
        onSelect={setActiveFeature}
      />

      <span className="dock-divider" />

      <Link
        href="/dashboard/notifications"
        aria-label="Notifications"
        title="Notifications"
        className={cn(
          "dock-action relative",
          pathname.startsWith("/dashboard/notifications") &&
            "dock-action-active",
        )}
      >
        <Bell size={22} />

        {notificationsCount > 0 && (
          <span className="notification-count">
            {notificationsCount > 99 ? "99+" : notificationsCount}
          </span>
        )}
      </Link>

      <button
        type="button"
        aria-label="Account"
        title="Account"
        onClick={() => {
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
      onClick={() => {
        // Only open the corresponding mini bar.
        // Do NOT navigate from the main floating bar.
        onSelect(feature);
      }}
      className={cn("dock-action", active && "dock-action-active")}
    >
      <Icon size={22} />
    </button>
  );
}

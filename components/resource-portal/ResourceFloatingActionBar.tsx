"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CheckSquare2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  List,
  LogOut,
  Plus,
  Search,
  Settings,
  Undo2,
  UserRound,
} from "lucide-react";
import { useState } from "react";

import { usePageSearch } from "@/components/providers/PageSearchProvider";
import { useResourceNotifications } from "@/components/providers/ResourceNotificationsProvider";
import ResourceNotificationPopover from "@/components/resource-portal/ResourceNotificationPopover";
import { cn } from "@/lib/utils";

type MiniBar = "tickets" | "projects" | "profile" | null;
type MainAction =
  | "search"
  | "dashboard"
  | "projects"
  | "tickets"
  | "notifications"
  | "profile"
  | null;

export default function ResourceFloatingActionBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [miniBar, setMiniBar] = useState<MiniBar>(null);
  const [searching, setSearching] = useState(false);
  const [mainAction, setMainAction] = useState<MainAction>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { unreadCount: notificationsCount } = useResourceNotifications();

  const {
    query: searchValue,
    setQuery,
    clearQuery,
    matchState,
  } = usePageSearch();

  const dashboardActive = pathname === "/resource/dashboard";
  const ticketsActive = pathname.startsWith("/resource/tickets");
  const projectsActive = pathname.startsWith("/resource/projects");
  const notificationsActive = pathname.startsWith("/resource/notifications");
  const profileActive = pathname.startsWith("/resource/profile");

  const notificationsLabel =
    notificationsCount > 0
      ? `Notifications (${notificationsCount > 99 ? "99+" : notificationsCount} new)`
      : "Notifications";

  function openSearch() {
    setNotificationsOpen(false);
    setMainAction("search");
    setMiniBar(null);
    setSearching(true);
  }

  function closeSearch() {
    setSearching(false);
    setMainAction(null);
    clearQuery();
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.replace("/login");
    router.refresh();
  }

  /*
   * SEARCH MINI BAR
   */
  if (searching) {
    return (
      <>
        <nav
          aria-label="Page search"
          className="resource-floating-dock resource-floating-search-mode"
        >
          <span className="resource-dock-search-active" aria-hidden="true">
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
            aria-invalid={matchState === "not-found"}
            className={cn(
              "resource-dock-search-input",
              matchState === "not-found" &&
                "resource-dock-search-input-not-found",
            )}
          />

          <span className="resource-dock-divider" />

          <button
            type="button"
            aria-label="Back to navigation"
            title="Back"
            onClick={closeSearch}
            className="resource-dock-action"
          >
            <Undo2 size={22} />
          </button>
        </nav>

        <ResourceFloatingStyles />
      </>
    );
  }

  /*
   * TICKETS MINI BAR
   * Search | Tickets | Create | Drafts | List | Back
   */
  if (miniBar === "tickets") {
    return (
      <>
        <nav
          aria-label="Ticket actions"
          className="resource-floating-dock resource-floating-feature-mode"
        >
          <button
            type="button"
            aria-label="Search current page"
            title="Search"
            onClick={openSearch}
            className="resource-dock-action"
          >
            <Search size={22} />
          </button>

          <span className="resource-dock-divider" />

          <span
            aria-label="Tickets"
            title="Tickets"
            className="resource-dock-action resource-dock-action-active"
          >
            <CheckSquare2 size={22} />
          </span>

          <Link
            href="/resource/tickets/new"
            aria-label="Create ticket"
            title="Create ticket"
            className={cn(
              "resource-dock-action",
              pathname === "/resource/tickets/new" &&
                "resource-dock-action-active",
            )}
          >
            <Plus size={23} />
          </Link>

          <Link
            href="/resource/tickets/drafts"
            aria-label="Ticket drafts"
            title="Ticket drafts"
            className={cn(
              "resource-dock-action",
              pathname.startsWith("/resource/tickets/drafts") &&
                "resource-dock-action-active",
            )}
          >
            <FileText size={22} />
          </Link>

          <Link
            href="/resource/tickets"
            aria-label="Tickets list"
            title="Tickets list"
            className={cn(
              "resource-dock-action",
              pathname === "/resource/tickets" &&
                "resource-dock-action-active",
            )}
          >
            <List size={22} />
          </Link>

          <span className="resource-dock-divider" />

          <button
            type="button"
            aria-label="Back to full navigation"
            title="Back"
            onClick={() => {
              setMiniBar(null);
              setMainAction(null);
            }}
            className="resource-dock-action"
          >
            <Undo2 size={22} />
          </button>
        </nav>

        <ResourceFloatingStyles />
      </>
    );
  }

  /*
   * PROJECTS MINI BAR
   * Search | Projects | List | Back
   *
   * No create-project action for the resource portal.
   */
  if (miniBar === "projects") {
    return (
      <>
        <nav
          aria-label="Project actions"
          className="resource-floating-dock resource-floating-feature-mode"
        >
          <button
            type="button"
            aria-label="Search current page"
            title="Search"
            onClick={openSearch}
            className="resource-dock-action"
          >
            <Search size={22} />
          </button>

          <span className="resource-dock-divider" />

          <span
            aria-label="Projects"
            title="Projects"
            className="resource-dock-action resource-dock-action-active"
          >
            <FolderKanban size={22} />
          </span>

          <Link
            href="/resource/projects"
            aria-label="Projects list"
            title="Projects list"
            className={cn(
              "resource-dock-action",
              pathname === "/resource/projects" &&
                "resource-dock-action-active",
            )}
          >
            <List size={22} />
          </Link>

          <span className="resource-dock-divider" />

          <button
            type="button"
            aria-label="Back to full navigation"
            title="Back"
            onClick={() => {
              setMiniBar(null);
              setMainAction(null);
            }}
            className="resource-dock-action"
          >
            <Undo2 size={22} />
          </button>
        </nav>

        <ResourceFloatingStyles />
      </>
    );
  }

  /*
   * PROFILE MINI BAR
   * Search | Profile | Settings | Logout | Back
   */
  if (miniBar === "profile") {
    return (
      <>
        <nav
          aria-label="Profile actions"
          className="resource-floating-dock resource-floating-feature-mode"
        >
          <button
            type="button"
            aria-label="Search current page"
            title="Search"
            onClick={openSearch}
            className="resource-dock-action"
          >
            <Search size={22} />
          </button>

          <span className="resource-dock-divider" />

          <span
            aria-label="Resource details"
            title="Resource details"
            className="resource-dock-action resource-dock-action-active"
          >
            <UserRound size={22} />
          </span>

          <Link
            href="/resource/profile"
            aria-label="Edit resource"
            title="Edit resource"
            className={cn(
              "resource-dock-action",
              pathname.startsWith("/resource/profile") &&
                "resource-dock-action-active",
            )}
          >
            <Settings size={22} />
          </Link>

          <button
            type="button"
            aria-label="Logout"
            title="Logout"
            onClick={logout}
            className="resource-dock-action"
          >
            <LogOut size={22} />
          </button>

          <span className="resource-dock-divider" />

          <button
            type="button"
            aria-label="Back to full navigation"
            title="Back"
            onClick={() => {
              setMiniBar(null);
              setMainAction(null);
            }}
            className="resource-dock-action"
          >
            <Undo2 size={22} />
          </button>
        </nav>

        <ResourceFloatingStyles />
      </>
    );
  }

  /*
   * MAIN RESOURCE BAR
   *
   * Search | Dashboard | Tickets | Projects | Notifications | Profile
   */
  return (
    <>
      {notificationsOpen ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="notification-popover-dismiss"
            onClick={() => setNotificationsOpen(false)}
          />

          <ResourceNotificationPopover
            onClose={() => setNotificationsOpen(false)}
          />
        </>
      ) : null}

      <nav
        aria-label="Resource portal navigation"
        className="resource-floating-dock resource-floating-full-mode"
      >
        <button
          type="button"
          aria-label="Search current page"
          title="Search"
          onClick={openSearch}
          className={cn(
            "resource-dock-action",
            mainAction === "search" && "resource-dock-action-active",
          )}
        >
          <Search size={22} />
        </button>

        <span className="resource-dock-divider" />

        <Link
          href="/resource/dashboard"
          aria-label="Dashboard"
          title="Dashboard"
          aria-current={dashboardActive ? "page" : undefined}
          onClick={() => {
            setNotificationsOpen(false);
            setMainAction("dashboard");
            setMiniBar(null);
          }}
          className={cn(
            "resource-dock-action",
            (dashboardActive || mainAction === "dashboard") &&
              "resource-dock-action-active",
          )}
        >
          <LayoutDashboard size={22} />
        </Link>

        <button
          type="button"
          aria-label="Projects"
          title="Projects"
          aria-current={projectsActive ? "page" : undefined}
          onClick={() => {
            setNotificationsOpen(false);
            setMainAction("projects");
            setMiniBar("projects");
          }}
          className={cn(
            "resource-dock-action",
            (projectsActive || mainAction === "projects") &&
              "resource-dock-action-active",
          )}
        >
          <FolderKanban size={22} />
        </button>

        <button
          type="button"
          aria-label="Tickets"
          title="Tickets"
          aria-current={ticketsActive ? "page" : undefined}
          onClick={() => {
            setNotificationsOpen(false);
            setMainAction("tickets");
            setMiniBar("tickets");
          }}
          className={cn(
            "resource-dock-action",
            (ticketsActive || mainAction === "tickets") &&
              "resource-dock-action-active",
          )}
        >
          <CheckSquare2 size={22} />
        </button>

        <span className="resource-dock-divider" />

        <button
          type="button"
          aria-label={notificationsLabel}
          title={notificationsLabel}
          aria-expanded={notificationsOpen}
          aria-controls="resource-notification-popover"
          onClick={() => {
            setMainAction("notifications");
            setMiniBar(null);
            setNotificationsOpen((current) => !current);
          }}
          className={cn(
            "resource-dock-action",
            (notificationsOpen ||
              notificationsActive ||
              mainAction === "notifications") &&
              "resource-dock-action-active",
          )}
        >
          <Bell size={22} />

          {notificationsCount > 0 ? (
            <span className="resource-notification-count">
              {notificationsCount > 99 ? "99+" : notificationsCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          aria-label="Profile"
          title="Profile"
          aria-current={profileActive ? "page" : undefined}
          onClick={() => {
            setNotificationsOpen(false);
            setMainAction("profile");
            setMiniBar("profile");
          }}
          className={cn(
            "resource-dock-action",
            (profileActive || mainAction === "profile") &&
              "resource-dock-action-active",
          )}
        >
          <UserRound size={22} />
        </button>
      </nav>

      <ResourceFloatingStyles />
    </>
  );
}

function ResourceFloatingStyles() {
  return (
    <style>{`
      .resource-floating-dock {
        position: fixed;
        z-index: 50;
        bottom: 24px;
        left: 50%;

        display: flex;
        transform: translateX(-50%);
        align-items: center;
        flex-wrap: nowrap;

        border: 2px solid #06b6d4;
        border-radius: 100px;

        background: rgba(255, 255, 255, 0.96);

        padding: 7px 10px;

        color: #0284c7;

        box-shadow:
          0 4px 9px rgba(0, 0, 0, 0.17),
          0 1px 2px rgba(16, 24, 40, 0.05);

        backdrop-filter: blur(7px);
        -webkit-backdrop-filter: blur(7px);

        white-space: nowrap;
      }

      .resource-floating-full-mode,
      .resource-floating-feature-mode {
        gap: 8px;
      }

      .resource-floating-search-mode {
        width: min(440px, calc(100vw - 32px));
        gap: 8px;
        padding: 7px 10px;
      }

      .resource-dock-action {
        position: relative;

        display: grid;
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        place-items: center;

        border: 0;
        border-radius: 9999px;

        background: transparent;
        color: #0284c7;

        text-decoration: none;
        cursor: pointer;

        transition:
          background-color 0.15s ease,
          color 0.15s ease,
          transform 0.15s ease;
      }

      .resource-dock-action:hover {
        background: #e6f8fb;
        color: #0284c7;
      }

      .resource-dock-action:active {
        transform: scale(0.96);
      }

      /*
       * Every icon in the MAIN action bar gets the same cyan circular
       * highlight immediately when it is clicked/pressed.
       */
      .resource-floating-full-mode .resource-dock-action:active {
        background: #0284c7;
        color: #ffffff;
      }

      .resource-dock-action:focus-visible {
        outline: 3px solid rgba(2, 132, 199, 0.18);
        outline-offset: 2px;
      }

      .resource-dock-action-active {
        background: #0284c7;
        color: #ffffff;
      }

      .resource-dock-action-active:hover {
        background: #0284c7;
        color: #ffffff;
      }

      .resource-dock-divider {
        width: 1px;
        height: 40px;
        flex: 0 0 1px;

        margin: 0 4px;

        background: #0284c7;
      }

      .resource-dock-search-active {
        display: grid;
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        place-items: center;

        border-radius: 9999px;

        background: #0284c7;
        color: #ffffff;
      }

      .resource-dock-search-input {
        min-width: 0;
        flex: 1;

        height: 36px;

        border: 1px solid #06b6d4;
        border-radius: 8px;

        background: #ffffff;

        padding: 0 12px;

        color: #344054;

        font-family: var(--font-inter), Inter, sans-serif;
        font-size: 14px;
        font-weight: 400;
        line-height: 20px;

        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05);

        outline: none;
      }

      .resource-dock-search-input::placeholder {
        color: #667085;
      }

      .resource-dock-search-input:focus {
        border-color: #0284c7;
        box-shadow:
          0 0 0 3px rgba(2, 132, 199, 0.1),
          0 1px 2px rgba(16, 24, 40, 0.05);
      }

      .resource-dock-search-input-not-found,
      .resource-dock-search-input-not-found:focus {
        border-color: #dc2626;
        color: #b91c1c;
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
      }

      .resource-notification-count {
        position: absolute;
        right: -0.15rem;
        top: -0.1rem;

        display: grid;
        min-width: 1rem;
        height: 1rem;
        place-items: center;

        border-radius: 9999px;

        background: #ff4444;

        padding: 0 0.2rem;

        color: #ffffff;

        font-size: 0.6rem;
        font-weight: 800;
      }

      @media (max-width: 640px) {
        .resource-floating-dock {
          bottom: 12px;
          max-width: calc(100vw - 16px);
          overflow-x: auto;

          padding: 6px 8px;

          scrollbar-width: none;
        }

        .resource-floating-dock::-webkit-scrollbar {
          display: none;
        }

        .resource-dock-action,
        .resource-dock-search-active {
          width: 36px;
          height: 36px;
          flex-basis: 36px;
        }

        .resource-dock-divider {
          height: 32px;
          margin: 0 2px;
        }

        .resource-floating-full-mode,
        .resource-floating-feature-mode {
          gap: 4px;
        }

        .resource-floating-search-mode {
          width: calc(100vw - 20px);
        }
      }
    `}</style>
  );
}
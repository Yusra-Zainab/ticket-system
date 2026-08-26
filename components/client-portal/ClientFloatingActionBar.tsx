"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BriefcaseBusiness,
  CheckSquare2,
  FileText,
  LayoutDashboard,
  List,
  LogOut,
  Plus,
  Settings,
  Undo2,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

export interface ClientFloatingActionBarProps {
  notificationsCount: number;
}

type ClientFeatureKey = "projects" | "tickets" | "team";

type FeatureConfig = {
  label: string;
  href: string;
  listHref: string;
  icon: LucideIcon;
  createHref?: string;
  createLabel?: string;
  draftsHref?: string;
};

const featureConfig: Record<ClientFeatureKey, FeatureConfig> = {
  projects: {
    label: "Projects",
    href: "/client/projects",
    listHref: "/client/projects",
    icon: BriefcaseBusiness,
  },
  tickets: {
    label: "Tickets",
    href: "/client/tickets",
    listHref: "/client/tickets",
    createHref: "/client/tickets/new",
    createLabel: "Create ticket",
    draftsHref: "/client/tickets/drafts",
    icon: CheckSquare2,
  },
  team: {
    label: "Team",
    href: "/client/team",
    listHref: "/client/team",
    createHref: "/client/team/new",
    createLabel: "Add team member",
    icon: UsersRound,
  },
};

function getFeatureFromPath(pathname: string): ClientFeatureKey | null {
  if (pathname.startsWith("/client/projects")) return "projects";
  if (pathname.startsWith("/client/tickets")) return "tickets";
  if (pathname.startsWith("/client/team")) return "team";
  return null;
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function ClientFloatingActionBar({
  notificationsCount,
}: ClientFloatingActionBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [activeFeature, setActiveFeature] =
    useState<ClientFeatureKey | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  const dashboardActive = pathname === "/client/dashboard";
  const notificationsActive = pathname.startsWith("/client/notifications");
  const profileActive = pathname.startsWith("/client/profile");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  if (accountOpen) {
    return (
      <>
        <nav
          aria-label="Client account actions"
          className="client-floating-dock client-feature-mode"
        >
          <span
            aria-label="Profile"
            title="Profile"
            className="client-dock-action client-dock-action-active"
          >
            <UserRound size={22} />
          </span>

          <Link
            href="/client/profile"
            aria-label="Profile details"
            title="Profile details"
            className={classNames(
              "client-dock-action",
              pathname === "/client/profile" && "client-dock-action-active",
            )}
          >
            <UserRound size={22} />
          </Link>

          <Link
            href="/client/profile/edit"
            aria-label="Edit profile"
            title="Edit profile"
            className={classNames(
              "client-dock-action",
              pathname.startsWith("/client/profile/edit") &&
                "client-dock-action-active",
            )}
          >
            <Settings size={22} />
          </Link>

          <button
            type="button"
            aria-label="Logout"
            title="Logout"
            onClick={logout}
            className="client-dock-action"
          >
            <LogOut size={22} />
          </button>

          <span className="client-dock-divider" />

          <button
            type="button"
            aria-label="Back to client navigation"
            title="Back"
            onClick={() => setAccountOpen(false)}
            className="client-dock-action"
          >
            <Undo2 size={22} />
          </button>
        </nav>

        <ClientFloatingStyles />
      </>
    );
  }

  if (activeFeature) {
    const config = featureConfig[activeFeature];
    const FeatureIcon = config.icon;

    return (
      <>
        <nav
          aria-label={`${config.label} actions`}
          className="client-floating-dock client-feature-mode"
        >
          <span
            aria-label={config.label}
            title={config.label}
            className="client-dock-action client-dock-action-active"
          >
            <FeatureIcon size={22} />
          </span>

          {config.createHref && (
            <Link
              href={config.createHref}
              aria-label={config.createLabel ?? `Create ${config.label}`}
              title={config.createLabel ?? `Create ${config.label}`}
              className={classNames(
                "client-dock-action",
                pathname === config.createHref && "client-dock-action-active",
              )}
            >
              <Plus size={23} />
            </Link>
          )}

          {config.draftsHref && (
            <Link
              href={config.draftsHref}
              aria-label="Ticket drafts"
              title="Ticket drafts"
              className={classNames(
                "client-dock-action",
                pathname.startsWith(config.draftsHref) &&
                  "client-dock-action-active",
              )}
            >
              <FileText size={22} />
            </Link>
          )}

          <Link
            href={config.listHref}
            aria-label={`${config.label} list`}
            title={`${config.label} list`}
            className={classNames(
              "client-dock-action",
              pathname === config.listHref && "client-dock-action-active",
            )}
          >
            <List size={22} />
          </Link>

          <span className="client-dock-divider" />

          <button
            type="button"
            aria-label="Back to client navigation"
            title="Back"
            onClick={() => setActiveFeature(null)}
            className="client-dock-action"
          >
            <Undo2 size={22} />
          </button>
        </nav>

        <ClientFloatingStyles />
      </>
    );
  }

  return (
    <>
      <nav
        aria-label="Client portal quick navigation"
        className="client-floating-dock client-full-mode"
      >
        <Link
          href="/client/dashboard"
          aria-label="Dashboard"
          title="Dashboard"
          aria-current={dashboardActive ? "page" : undefined}
          onClick={() => {
            setActiveFeature(null);
            setAccountOpen(false);
          }}
          className={classNames(
            "client-dock-action",
            dashboardActive && "client-dock-action-active",
          )}
        >
          <LayoutDashboard size={22} />
        </Link>

        <ClientFeatureButton
          feature="projects"
          pathname={pathname}
          onSelect={(feature) => {
            setAccountOpen(false);
            setActiveFeature(feature);
          }}
        />

        <ClientFeatureButton
          feature="tickets"
          pathname={pathname}
          onSelect={(feature) => {
            setAccountOpen(false);
            setActiveFeature(feature);
          }}
        />

        <ClientFeatureButton
          feature="team"
          pathname={pathname}
          onSelect={(feature) => {
            setAccountOpen(false);
            setActiveFeature(feature);
          }}
        />

        <span className="client-dock-divider" />

        <Link
          href="/client/notifications"
          aria-label={
            notificationsCount > 0
              ? `Notifications (${notificationsCount > 99 ? "99+" : notificationsCount} new)`
              : "Notifications"
          }
          title="Notifications"
          aria-current={notificationsActive ? "page" : undefined}
          onClick={() => {
            setActiveFeature(null);
            setAccountOpen(false);
          }}
          className={classNames(
            "client-dock-action client-dock-notifications",
            notificationsActive && "client-dock-action-active",
          )}
        >
          <Bell size={22} />
          {notificationsCount > 0 && (
            <span className="client-notification-count">
              {notificationsCount > 99 ? "99+" : notificationsCount}
            </span>
          )}
        </Link>

        <button
          type="button"
          aria-label="Profile and account"
          title="Profile and account"
          onClick={() => {
            setActiveFeature(null);
            setAccountOpen(true);
          }}
          className={classNames(
            "client-dock-action",
            profileActive && "client-dock-action-active",
          )}
        >
          <UserRound size={22} />
        </button>
      </nav>

      <ClientFloatingStyles />
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
      className={classNames(
        "client-dock-action",
        active && "client-dock-action-active",
      )}
    >
      <Icon size={22} />
    </button>
  );
}

function ClientFloatingStyles() {
  return (
    <style>{`
      .client-floating-dock {
        position: fixed;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%);
        z-index: 90;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 8px;
        background: #ffffff;
        border: 1px solid #e4e7ec;
        border-radius: 16px;
        box-shadow: 0 14px 36px rgba(16, 24, 40, 0.16);
      }

      .client-dock-action {
        position: relative;
        width: 44px;
        height: 44px;
        flex: 0 0 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        color: #667085;
        background: transparent;
        border: 0;
        border-radius: 10px;
        text-decoration: none;
        cursor: pointer;
        transition:
          background-color 160ms ease,
          color 160ms ease,
          transform 160ms ease;
      }

      .client-dock-action:hover {
        color: #0284c7;
        background: #e6f8fb;
        transform: translateY(-1px);
      }

      .client-dock-action-active {
        color: #ffffff;
        background: linear-gradient(
          66.43deg,
          #0284c7 12.82%,
          #06b6d4 47.68%,
          #22d3ee 82.54%
        );
      }

      .client-dock-action-active:hover {
        color: #ffffff;
        background: linear-gradient(
          66.43deg,
          #0284c7 12.82%,
          #06b6d4 47.68%,
          #22d3ee 82.54%
        );
      }

      .client-dock-divider {
        width: 1px;
        height: 28px;
        margin: 0 4px;
        background: #eaecf0;
      }

      .client-dock-notifications {
        overflow: visible;
      }

      .client-notification-count {
        position: absolute;
        top: 2px;
        right: 1px;
        min-width: 17px;
        height: 17px;
        padding: 0 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        border-radius: 999px;
        background: #f04438;
        color: #ffffff;
        font-family: Inter, Arial, sans-serif;
        font-size: 9px;
        font-weight: 700;
        line-height: 1;
      }

      @media (max-width: 640px) {
        .client-floating-dock {
          bottom: 12px;
          max-width: calc(100vw - 24px);
          overflow-x: auto;
          scrollbar-width: none;
        }

        .client-floating-dock::-webkit-scrollbar {
          display: none;
        }

        .client-dock-action {
          width: 42px;
          height: 42px;
          flex-basis: 42px;
        }
      }
    `}</style>
  );
}
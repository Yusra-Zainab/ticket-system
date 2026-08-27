import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CheckSquare2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  List,
  Plus,
} from "lucide-react";

export type ResourceNavAction = {
  id: string;
  permission: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export type ResourceNavSection = {
  id: "dashboard" | "projects" | "tickets" | "notifications";
  permission: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  actions?: ResourceNavAction[];
};

/*
 * Every icon the resource portal action bar can show is declared here.
 * To add a new capability: add an entry. The component below never
 * needs to change — it renders whatever this array says is visible
 * for the resource's actual permissions.
 *
 * Deliberately NOT represented here (no resource-portal page exists
 * for these permission groups): Resources, Clients, Users,
 * Administration. A resource with those permissions is unusual —
 * they're normally admin-only — but if that ever changes, add a
 * section here rather than hardcoding a new check in the component.
 */
export const resourceNavSections: ResourceNavSection[] = [
  {
    id: "dashboard",
    permission: "View Dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/resource-portal/dashboard",
  },
  {
    id: "projects",
    permission: "View Projects",
    label: "Projects",
    icon: FolderKanban,
    actions: [
      {
        id: "projects-list",
        permission: "View Projects",
        label: "Projects list",
        href: "/resource-portal/projects",
        icon: List,
      },
      // "Create Projects" intentionally has no action here — the
      // resource portal has no project-creation page (see the
      // comment in app/resources/new/page.tsx-adjacent code).
    ],
  },
  {
    id: "tickets",
    permission: "View Tickets",
    label: "Tickets",
    icon: CheckSquare2,
    actions: [
      {
        id: "tickets-create",
        permission: "Create Tickets",
        label: "Create ticket",
        href: "/resource-portal/tickets/new",
        icon: Plus,
      },
      {
        id: "tickets-drafts",
        permission: "Create Tickets",
        label: "Ticket drafts",
        href: "/resource-portal/tickets/drafts",
        icon: FileText,
      },
      {
        id: "tickets-list",
        permission: "View Tickets",
        label: "Tickets list",
        href: "/resource-portal/tickets",
        icon: List,
      },
    ],
  },
  {
    id: "notifications",
    permission: "View Notifications",
    label: "Notifications",
    icon: Bell,
  },
];
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  CheckSquare2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  List,
  Mail,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";

export type ResourceNavAction = {
  id: string;
  permission: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

export type ResourceNavSection = {
  id:
    | "dashboard"
    | "projects"
    | "tickets"
    | "resources"
    | "clients"
    | "users"
    | "administration"
    | "notifications";
  permission: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  actions?: ResourceNavAction[];
};

/*
 * Every icon the resource portal action bar can show is declared here.
 * To add a new capability: add an entry. The component below never
 * needs to change - it renders whatever this array says is visible
 * for the resource's actual permissions.
 *
 * Resources, Clients, and Users now exist as resource-portal pages,
 * so their sections are represented here alongside Projects and
 * Tickets.
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
      {
        id: "projects-create",
        permission: "Create Projects",
        label: "New project",
        href: "/resource-portal/projects/new",
        icon: Plus,
      },
      {
        id: "projects-drafts",
        permission: "Create Projects",
        label: "Project drafts",
        href: "/resource-portal/projects/drafts",
        icon: FileText,
      },
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
    id: "resources",
    permission: "View Resources",
    label: "Resources",
    icon: Users,
    actions: [
      {
        id: "resources-list",
        permission: "View Resources",
        label: "Resources list",
        href: "/resource-portal/resources",
        icon: List,
      },
      {
        id: "resources-create",
        permission: "Create Resources",
        label: "New resource",
        href: "/resource-portal/resources/new",
        icon: Plus,
      },
      {
        id: "resources-drafts",
        permission: "Create Resources",
        label: "Resource drafts",
        href: "/resource-portal/resources/drafts",
        icon: FileText,
      },
    ],
  },
  {
    id: "clients",
    permission: "View Clients",
    label: "Clients",
    icon: Building2,
    actions: [
      {
        id: "clients-list",
        permission: "View Clients",
        label: "Clients list",
        href: "/resource-portal/clients",
        icon: List,
      },
      {
        id: "clients-create",
        permission: "Create Clients",
        label: "New client",
        href: "/resource-portal/clients/new",
        icon: Plus,
      },
      {
        id: "clients-drafts",
        permission: "Create Clients",
        label: "Client drafts",
        href: "/resource-portal/clients/drafts",
        icon: FileText,
      },
    ],
  },
  {
    id: "users",
    permission: "View Users",
    label: "Users",
    icon: Users,
    actions: [
      {
        id: "users-list",
        permission: "View Users",
        label: "Users list",
        href: "/resource-portal/users",
        icon: List,
      },
      {
        id: "users-create",
        permission: "Create Users",
        label: "New admin",
        href: "/resource-portal/users/new",
        icon: Plus,
      },
    ],
  },
  {
    id: "administration",
    permission: "View Roles",
    label: "Administration",
    icon: ShieldCheck,
    actions: [
      {
        id: "roles-list",
        permission: "View Roles",
        label: "Roles list",
        href: "/resource-portal/roles",
        icon: List,
      },
      {
        id: "roles-create",
        permission: "Create Roles",
        label: "New role",
        href: "/resource-portal/roles/new",
        icon: Plus,
      },
      {
        id: "email-settings",
        permission: "Configure Email",
        label: "Email settings",
        href: "/resource-portal/settings/email",
        icon: Mail,
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

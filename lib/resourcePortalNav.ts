import { FileText } from "lucide-react";

import {
  AdministrationIcon,
  ClientsIcon,
  CreateNewIcon,
  DashboardIcon,
  EmailSettingsIcon,
  ListIcon,
  type NavIcon,
  NotificationIcon,
  ProjectsIcon,
  ResourcesIcon,
  TicketsIcon,
  UsersIcon,
} from "@/components/ui/navIcons";

export type ResourceNavAction = {
  id: string;
  permission: string;
  label: string;
  href: string;
  icon: NavIcon;
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
  icon: NavIcon;
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
    icon: DashboardIcon,
    href: "/resource-portal/dashboard",
  },
  {
    id: "projects",
    permission: "View Projects",
    label: "Projects",
    icon: ProjectsIcon,
    actions: [
      {
        id: "projects-list",
        permission: "View Projects",
        label: "Projects list",
        href: "/resource-portal/projects",
        icon: ListIcon,
      },
      {
        id: "projects-create",
        permission: "Create Projects",
        label: "New project",
        href: "/resource-portal/projects/new",
        icon: CreateNewIcon,
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
    icon: TicketsIcon,
    actions: [
      {
        id: "tickets-create",
        permission: "Create Tickets",
        label: "Create ticket",
        href: "/resource-portal/tickets/new",
        icon: CreateNewIcon,
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
        icon: ListIcon,
      },
    ],
  },
  {
    id: "resources",
    permission: "View Resources",
    label: "Resources",
    icon: ResourcesIcon,
    actions: [
      {
        id: "resources-list",
        permission: "View Resources",
        label: "Resources list",
        href: "/resource-portal/resources",
        icon: ListIcon,
      },
      {
        id: "resources-create",
        permission: "Create Resources",
        label: "New resource",
        href: "/resource-portal/resources/new",
        icon: CreateNewIcon,
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
    icon: ClientsIcon,
    actions: [
      {
        id: "clients-list",
        permission: "View Clients",
        label: "Clients list",
        href: "/resource-portal/clients",
        icon: ListIcon,
      },
      {
        id: "clients-create",
        permission: "Create Clients",
        label: "New client",
        href: "/resource-portal/clients/new",
        icon: CreateNewIcon,
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
    icon: UsersIcon,
    actions: [
      {
        id: "users-list",
        permission: "View Users",
        label: "Users list",
        href: "/resource-portal/users",
        icon: ListIcon,
      },
      {
        id: "users-create",
        permission: "Create Users",
        label: "New admin",
        href: "/resource-portal/users/new",
        icon: CreateNewIcon,
      },
    ],
  },
  {
    id: "administration",
    permission: "View Roles",
    label: "Administration",
    icon: AdministrationIcon,
    actions: [
      {
        id: "roles-list",
        permission: "View Roles",
        label: "Roles list",
        href: "/resource-portal/roles",
        icon: ListIcon,
      },
      {
        id: "roles-create",
        permission: "Create Roles",
        label: "New role",
        href: "/resource-portal/roles/new",
        icon: CreateNewIcon,
      },
      {
        id: "email-settings",
        permission: "Configure Email",
        label: "Email settings",
        href: "/resource-portal/settings/email",
        icon: EmailSettingsIcon,
      },
    ],
  },
  {
    id: "notifications",
    permission: "View Notifications",
    label: "Notifications",
    icon: NotificationIcon,
  },
];

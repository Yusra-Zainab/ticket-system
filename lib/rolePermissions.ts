export type PermissionGroup = {
  name: string;

  permissions: string[];
};

export const permissionGroups: PermissionGroup[] = [
  {
    name: "Dashboard",

    permissions: ["View Dashboard", "View Reports", "Export Reports"],
  },

  {
    name: "Tickets",

    permissions: [
      "View Tickets",
      "Create Tickets",
      "Edit Tickets",
      "Delete Tickets",
      "Assign Tickets",
      "Change Ticket Status",
      "Change Ticket Priority",
      "View Ticket Reports",
    ],
  },

  {
    name: "Projects",

    permissions: [
      "View Projects",
      "Create Projects",
      "Edit Projects",
      "Delete Projects",
      "Assign Project Team",
      "Manage Project Modules",
      "Manage Project Files",
      "View Project Reports",
    ],
  },

  {
    name: "Resources",

    permissions: [
      "View Resources",
      "Create Resources",
      "Edit Resources",
      "Delete Resources",
      "Assign Resources",
      "View Resource Workload",
    ],
  },

  {
    name: "Clients",

    permissions: [
      "View Clients",
      "Create Clients",
      "Edit Clients",
      "Delete Clients",
      "Assign Client Projects",
      "Manage Client Team",
    ],
  },

  {
    name: "Users",

    permissions: [
      "View Users",
      "Create Users",
      "Edit Users",
      "Disable Users",
      "Delete Users",
    ],
  },

  {
    name: "Administration",

    permissions: [
      "View Roles",
      "Create Roles",
      "Edit Roles",
      "Delete Custom Roles",
      "Manage Permissions",
      "Configure Email",
      "Configure System Settings",
    ],
  },

  {
    name: "Notifications",

    permissions: [
      "View Notifications",
      "Manage Notifications",
      "Send System Notifications",
    ],
  },
];

export const allPermissions = permissionGroups.flatMap(
  (group) => group.permissions,
);

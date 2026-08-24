export type ResourceTicketLifecycle = "DRAFT" | "OPEN";

export type ResourceTicketStatus =
  | "Open"
  | "Reviewed"
  | "Assigned"
  | "Active"
  | "Blocked"
  | "Awaiting"
  | "QA"
  | "Validation"
  | "Resolved"
  | "Closed"
  | "Reopened"
  | "Cancelled";

export type ResourceTicketPriority =
  | "Critical"
  | "High"
  | "Medium"
  | "Low"
  | "Not Assigned";

export type ResourceTicketType =
  | "Bug"
  | "Task"
  | "Change Request"
  | "New Feature"
  | "Feedback"
  | "Support Request"
  | "UI/UX Issue"
  | "Content Update"
  | "Technical Issue"
  | "Testing / QA"
  | "Maintenance"
  | "Urgent Fix"
  | "System Down";

export interface ResourcePortalProjectFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  url: string;
}

export interface ResourcePortalProjectMember {
  id: string;
  name: string;
  role: string;
  avatar?: string | null;
}

export interface ResourcePortalProject {
  id: string;
  name: string;
  description: string;
  client: string;
  status: string;
  priority: string;
  progress: number;
  dueDate: string;
  updatedAt: string;
  openTickets: number;
  team: ResourcePortalProjectMember[];
  files: ResourcePortalProjectFile[];
  moduleName: string;
  subModule: string;
  links: {
    staging?: string;
    live?: string;
    figma?: string;
    github?: string;
  };
  allowSelfAssign: boolean;
}

export interface ResourcePortalTicketAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  url: string;
}

export interface ResourcePortalComment {
  id: string;
  userId?: number | null;
  user: string;
  avatar?: string | null;
  content: string;
  createdAt: string;
}

export interface ResourcePortalActivity {
  id: string;
  action: string;
  status?: string | null;
  user: string;
  createdAt: string;
}

export interface ResourcePortalTicket {
  id: string;
  databaseId: number;
  lifecycle: ResourceTicketLifecycle;
  title: string;
  description: string;
  type: ResourceTicketType;
  projectId?: string | null;
  project: string;
  status: ResourceTicketStatus;
  priority: ResourceTicketPriority;
  assignee: string;
  reporter: string;
  createdById?: number | null;
  assignedToId?: number | null;
  createdAt: string;
  updatedAt: string;
  dueDate: string;
  links: string[];
  attachments: ResourcePortalTicketAttachment[];
  comments?: ResourcePortalComment[];
  activities?: ResourcePortalActivity[];
  permissions?: {
    canEditDetails: boolean;
    canChangeStatus: boolean;
    canSelfAssign: boolean;
    canComment: boolean;
    canUpload: boolean;
    canAddLink: boolean;
  };
}

export interface ResourcePortalProfile {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  avatar: string;
  role: string;
  emailNotifications: boolean;
}

export interface ResourcePortalDashboardStats {
  assignedProjects: number;
  openTickets: number;
  assignedTickets: number;
  drafts: number;
}

export interface ResourcePortalNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  href: string;
}

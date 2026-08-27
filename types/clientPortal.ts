export type ClientTicketLifecycle = "DRAFT" | "OPEN";

export type ClientTicketStatus =
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

export type ClientTicketPriority =
  | "Critical"
  | "High"
  | "Medium"
  | "Low"
  | "Not Assigned";

export type ClientTicketType =
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

export interface ClientPortalUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface ClientPortalProjectFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  url: string;
}

export interface ClientPortalProjectMember {
  id: string;
  name: string;
  role: string;
  avatar?: string | null;
}

export interface ClientPortalProjectModule {
  id: string;
  name: string;
  subModules: Array<{
    id: string;
    name: string;
  }>;
}

export interface ClientPortalProject {
  id: string;
  name: string;
  description: string;
  company: string;
  status: string;
  priority: string;
  progress: number;
  dueDate: string;
  startDate: string;
  updatedAt: string;
  openTickets: number;
  criticalTickets: number;
  projectType: string;
  department: string;
  team: ClientPortalProjectMember[];
  files: ClientPortalProjectFile[];
  moduleName: string;
  subModule: string;
  modules: ClientPortalProjectModule[];
  links: {
    staging?: string;
    live?: string;
    figma?: string;
    github?: string;
  };
}

export interface ClientPortalTicketAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  url: string;
}

export interface ClientPortalComment {
  id: string;
  userId?: number | null;
  user: string;
  avatar?: string | null;
  attachments?: string[];
  content: string;
  createdAt: string;
}

export interface ClientPortalActivity {
  id: string;
  action: string;
  status?: string | null;
  user: string;
  createdAt: string;
}

export interface ClientPortalTicket {
  id: string;
  databaseId: number;
  lifecycle: ClientTicketLifecycle;
  title: string;
  description: string;
  type: ClientTicketType;
  projectId?: string | null;
  project: string;
  status: ClientTicketStatus;
  priority: ClientTicketPriority;
  assignee: string;
  reporter: string;
  createdById?: number | null;
  assignedToId?: number | null;
  createdAt: string;
  updatedAt: string;
  dueDate: string;
  titleHistory: string[];
  links: string[];
  watcherIds: number[];
  attachments: ClientPortalTicketAttachment[];
  comments?: ClientPortalComment[];
  activities?: ClientPortalActivity[];
  permissions?: {
    canEditDetails: boolean;
    canClose: boolean;
    canReopen: boolean;
    canComment: boolean;
    canUpload: boolean;
    canWatch: boolean;
  };
}

export interface ClientPortalProfile {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  avatar: string;
  company: string;
  role: string;
  emailNotifications: boolean;
}

export interface ClientPortalTeamMember {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  communicationChannel?: string;
  avatar?: string | null;
  status: "Active" | "Inactive";
  addedAt: string;
}

export interface ClientPortalDashboardStats {
  activeProjects: number;
  openTickets: number;
  drafts: number;
  teamMembers: number;
}

export interface ClientPortalNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  href: string;
}

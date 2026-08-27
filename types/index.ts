export type Status =
  | "Active"
  | "Critical"
  | "In Progress"
  | "Open"
  | "Closed"
  | "Overdue"
  | "Blocked"
  | "Paused"
  | "On Track"
  | "Ready for Review"
  | "Low"
  | "Medium"
  | "High"
  | "New"
  | "Assigned"
  | "Reviewed"
  | "Awaiting"
  | "QA"
  | "Validation"
  | "Resolved"
  | "Reopened"
  | "Cancelled"
  | "Completed";

export type ProjectStatus =
  | "Planning"
  | "Not Started"
  | "Active"
  | "On Hold"
  | "At Risk"
  | "Delayed"
  | "Completed"
  | "Cancelled"
  | "Archived";

export type ProjectPriority =
  | "Critical"
  | "High"
  | "Medium"
  | "Low"
  | "Not Assigned";

export type Lifecycle = "DRAFT" | "OPEN";

/* =========================================================
   CLIENTS
   ========================================================= */

export type ClientLifecycle = "DRAFT" | "OPEN";

export type ClientListStatus =
  | "Active"
  | "Inactive"
  | "Onboarding"
  | "Paused"
  | "Completed";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  projects: number;
  status: Status;
  joined: string;
}

export type ClientTeamMember = {
  id: string;
  name: string;
  avatar?: string | null;
};

export interface ClientAssignedProject {
  id: string;
  name: string;
}

export interface ClientListRow {
  id: string;

  clientName: string;

  primaryContact: string;

  contactMethod: string;

  assignedProjects: ClientAssignedProject[];

  openTickets: number;

  clientTeam: ClientTeamMember[];

  status: ClientListStatus;

  lastActivity: string;
}

export interface ClientTeamMemberInput {
  id: string;

  name: string;

  role: string;

  email: string;

  phone: string;

  contactChannel: string;

  accessLevel: string;
}

export interface ClientFormData {
  /* Basic client information */
  clientName: string;
  clientType: string;
  clientSource: string;
  industry: string;
  website: string;
  clientStatus: string;

  /* Primary contact */
  primaryContactName: string;
  primaryJobTitle: string;
  primaryEmail: string;
  primaryPhone: string;
  preferredContact: string;

  /* Upwork */
  upworkProfileName: string;
  upworkProfileUrl: string;
  upworkContractId: string;
  upworkPhone: string;
  contractType: string;
  budgetRate: string;
  contractStatus: string;

  /* Client team */
  teamMembers: ClientTeamMemberInput[];

  /* Communication */
  whatsappNumber: string;
  viberNumber: string;
  communicationPreference: string;

  /* Project assignment */
  projectIds: string[];
  accountManagerId: string;
  coordinatorId: string;

  /* Integration */
  integrationType: string;
  apiBaseUrl: string;
  webhookUrl: string;
  apiKey: string;

  /* Notes */
  internalNotes: string;
}

export interface ClientEditorRecord {
  id: string;

  lifecycle: ClientLifecycle;

  formData: ClientFormData;

  updatedAt: string;
}

export interface ClientDraftRow {
  id: string;

  clientName: string;

  primaryContact: string;

  clientType: string;

  clientSource: string;

  status: string;

  updatedAt: string;
}

/* =========================================================
   TICKETS
   ========================================================= */

export interface TicketAttachment {
  id: string;

  name: string;

  mimeType: string;

  size: number;

  url: string;

  uploadedAt: string;
}

export type TicketCommentRecord = {
  id: string;
  userId?: number | null;
  user: string;
  avatar?: string | null;
  time: string;
  text: string;
  attachments?: string[];
};

export type TicketFormData = Record<string, unknown> & {
  attachments?: TicketAttachment[];
  titleHistory?: string[];
  activity?: string[];
  comments?: TicketCommentRecord[];
};

export interface Ticket {
  id: string;

  createdById?: number | null;

  title: string;

  project: string;

  status: Status;

  priority: 1 | 2 | 3 | 4 | 5;

  assignedTo: string;

  reporter: string;

  created: string;

  updatedAt: string;

  dueDate: string;

  description: string;

  tags: string[];

  formData?: TicketFormData;
}

/* =========================================================
   PROJECTS
   ========================================================= */

export interface ProjectSubModuleDefinition {
  id: string;

  name: string;
}

export interface ProjectModuleDefinition {
  id: string;

  name: string;

  subModules: ProjectSubModuleDefinition[];
}

export interface ProjectTeamMember {
  id: string;

  name: string;

  role: string;

  avatar?: string | null;
}

export type ProjectFormData = Record<string, unknown> & {
  priority?: ProjectPriority;

  projectType?: string;

  clientOwnerId?: string;

  coordinatorId?: string;

  department?: string;

  teamIds?: string[];

  moduleName?: string;

  subModule?: string;

  moduleOwnerId?: string;

  modules?: ProjectModuleDefinition[];

  links?: {
    staging?: string;
    live?: string;
    figma?: string;
    github?: string;
  };

  internalNotes?: string;

  attachments?: TicketAttachment[];
};

export interface Project {
  id: string;

  lifecycle: Lifecycle;

  name: string;

  client: string;

  clientId?: string;

  status: ProjectStatus;

  priority: ProjectPriority;

  progress: number;

  dueDate: string;

  startDate: string;

  budget: number;

  description: string;

  team: string[];

  teamMembers: ProjectTeamMember[];

  openTickets: number;

  criticalTickets: number;

  lastUpdated: string;

  formData?: ProjectFormData;
}

/* =========================================================
   USERS / RESOURCES
   ========================================================= */

export interface User {
  id: string;

  name: string;

  role: string;

  email: string;

  phone: string;

  status: Status;

  workload: number;

  skills: string[];

  avatar?: string | null;
}

export interface ResourceListRow {
  id: string;

  name: string;

  avatar?: string | null;

  jobTitle: string;

  team: string;

  skills: string[];

  assignedProjects: number;

  activeTickets: number;

  reportingTo: string;

  status: "Active" | "Inactive";
}

/* =========================================================
   ACTIVITY
   ========================================================= */

export interface Activity {
  id: string;

  timestamp: string;

  text: string;

  user: string;

  status?: Status;

  avatar?: string;
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

export interface Notification {
  id: string;

  category: "Tickets" | "Mentions" | "Deadlines" | "System";

  title: string;

  body: string;

  href: string;

  time: string;

  unread: boolean;
}

/* =========================================================
   ROLES
   ========================================================= */

export interface Role {
  id: string;

  name: string;

  description: string;

  users: number;

  permissions: string[];
}

export type RoleType = "SYSTEM" | "CUSTOM";

export interface RoleRecord {
  id: string;

  name: string;

  description: string;

  roleType: string;

  type: RoleType;

  users: number;

  permissions: string[];

  updatedAt: string;
}

export interface RoleFormRecord {
  id: string;

  name: string;

  description: string;

  roleType: string;

  type: RoleType;

  permissions: string[];
}

export interface AdminUserListRow {
  id: string;

  name: string;

  avatar?: string | null;

  role: string;

  email: string;

  addedOn: string;

  status: "Active" | "Inactive";

  lastActive: string;
}

export type AdminUserStatus = "Active" | "Inactive";

export type AdminFormData = {
  firstName: string;
  lastName: string;
  jobTitle: string;

  email: string;
  workEmail?: string;
  phone: string;
  communicationChannel: string;
  timeZone?: string;
  twoFactorEnabled?: boolean;

  skills: string[];
  experienceLevel: string;
  employmentType: string;

  status: AdminUserStatus;
};

export interface AdminEditorRecord {
  id: string;

  name: string;

  email: string;

  role: string;

  avatar?: string | null;

  lifecycle: "OPEN" | "DRAFT";

  formData: AdminFormData;
}

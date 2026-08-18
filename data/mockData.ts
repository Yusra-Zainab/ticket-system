import type { Activity, Client, Notification, Project, Role, Ticket, User } from '@/types';

export const mockClients: Client[] = [
  { id: '1', name: 'Sophia Aristadou', company: 'Aristadou Group', email: 'info@aristadou.com', phone: '+92 300 555 0101', projects: 3, status: 'Active', joined: '2025-03-14' },
  { id: '2', name: 'Mason Wright', company: 'PBT Payments', email: 'support@pbtpayments.com', phone: '+92 300 555 0102', projects: 2, status: 'Active', joined: '2025-06-02' },
  { id: '3', name: 'Ava Mitchell', company: 'Northstar Labs', email: 'hello@northstarlabs.io', phone: '+92 300 555 0103', projects: 4, status: 'On Track', joined: '2025-08-18' },
  { id: '4', name: 'Ethan Cole', company: 'Cedar Retail', email: 'ethan@cedarretail.com', phone: '+92 300 555 0104', projects: 1, status: 'Paused', joined: '2026-01-11' },
  { id: '5', name: 'Emma Lewis', company: 'Halo Health', email: 'emma@halohealth.co', phone: '+92 300 555 0105', projects: 2, status: 'Active', joined: '2026-02-24' },
];

export const mockProjects: Project[] = [
  { id: '1', name: 'AG Property Manager', client: 'Aristadou Group', status: 'Active', progress: 75, dueDate: '2026-12-31', startDate: '2026-03-01', budget: 84000, description: 'A unified property operations portal for tenants, leases, maintenance, and payments.', team: ['Ahmed Khan', 'Olivia Rhy', 'Phoenix Baker'], teamMembers: [{ id: '1', name: 'Ahmed Khan', role: 'Backend Developer' }, { id: '2', name: 'Olivia Rhy', role: 'Product Designer' }, { id: '3', name: 'Phoenix Baker', role: 'Project Manager' }], openTickets: 4, criticalTickets: 1, lastUpdated: '2026-08-17T12:00:00Z', priority: 'High' },
  { id: '2', name: 'PBT Merchant Console', client: 'PBT Payments', status: 'Critical', progress: 43, dueDate: '2026-09-20', startDate: '2026-04-18', budget: 120000, description: 'Real-time settlement, dispute, and merchant reporting experience.', team: ['Ahmed Khan', 'Lana Steiner'], teamMembers: [{ id: '1', name: 'Ahmed Khan', role: 'Backend Developer' }, { id: '4', name: 'Lana Steiner', role: 'Frontend Developer' }], openTickets: 7, criticalTickets: 3, lastUpdated: '2026-08-16T09:30:00Z', priority: 'Critical' },
  { id: '3', name: 'Northstar Analytics', client: 'Northstar Labs', status: 'On Track', progress: 68, dueDate: '2027-01-15', startDate: '2026-05-09', budget: 96000, description: 'Self-service analytics and experiment monitoring for product teams.', team: ['Olivia Rhy', 'Phoenix Baker'], teamMembers: [{ id: '2', name: 'Olivia Rhy', role: 'Product Designer' }, { id: '3', name: 'Phoenix Baker', role: 'Project Manager' }], openTickets: 2, criticalTickets: 0, lastUpdated: '2026-08-15T11:15:00Z', priority: 'Medium' },
  { id: '4', name: 'Cedar Commerce', client: 'Cedar Retail', status: 'Paused', progress: 31, dueDate: '2027-03-10', startDate: '2026-02-12', budget: 72000, description: 'Omnichannel inventory and storefront modernization program.', team: ['Lana Steiner'], teamMembers: [{ id: '4', name: 'Lana Steiner', role: 'Frontend Developer' }], openTickets: 1, criticalTickets: 0, lastUpdated: '2026-08-14T16:45:00Z', priority: 'Low' },
  { id: '5', name: 'Halo Patient Portal', client: 'Halo Health', status: 'In Progress', progress: 56, dueDate: '2026-11-28', startDate: '2026-04-02', budget: 135000, description: 'Secure scheduling, messaging, and patient document access.', team: ['Ahmed Khan', 'Olivia Rhy'], teamMembers: [{ id: '1', name: 'Ahmed Khan', role: 'Backend Developer' }, { id: '2', name: 'Olivia Rhy', role: 'Product Designer' }], openTickets: 5, criticalTickets: 1, lastUpdated: '2026-08-13T08:20:00Z', priority: 'Not Assigned' },
];

export const mockTickets: Ticket[] = [
  { id: '1', title: 'Payment receipt not downloading', project: 'AG Property Manager', status: 'Critical', priority: 1, assignedTo: 'Ahmed Khan', reporter: 'Sophia Aristadou', created: '2026-08-10', dueDate: '2026-08-16', description: '<p>Users are unable to download payment receipts after completing a card transaction. The request returns successfully but no file is saved.</p><p>Please verify PDF generation and browser download headers.</p>', tags: ['payments', 'pdf'] },
  { id: '2', title: 'Settlement totals differ from export', project: 'PBT Merchant Console', status: 'Blocked', priority: 1, assignedTo: 'Lana Steiner', reporter: 'Mason Wright', created: '2026-08-11', dueDate: '2026-08-15', description: '<p>The dashboard total does not match the CSV export for multi-currency settlements.</p>', tags: ['reporting', 'finance'] },
  { id: '3', title: 'Add saved analytics filters', project: 'Northstar Analytics', status: 'In Progress', priority: 2, assignedTo: 'Olivia Rhy', reporter: 'Ava Mitchell', created: '2026-08-12', dueDate: '2026-08-24', description: '<p>Allow users to name and reuse common dashboard filter combinations.</p>', tags: ['analytics', 'ux'] },
  { id: '4', title: 'Improve mobile navigation', project: 'Halo Patient Portal', status: 'Open', priority: 3, assignedTo: 'Phoenix Baker', reporter: 'Emma Lewis', created: '2026-08-13', dueDate: '2026-08-29', description: '<p>Collapse secondary navigation into an accessible mobile menu.</p>', tags: ['mobile', 'accessibility'] },
  { id: '5', title: 'Inventory sync retry strategy', project: 'Cedar Commerce', status: 'Paused', priority: 4, assignedTo: 'Lana Steiner', reporter: 'Ethan Cole', created: '2026-08-09', dueDate: '2026-09-02', description: '<p>Define exponential retry behavior for failed supplier inventory updates.</p>', tags: ['inventory', 'integration'] },
  { id: '6', title: 'Expose lease renewal reminders', project: 'AG Property Manager', status: 'Ready for Review', priority: 2, assignedTo: 'Olivia Rhy', reporter: 'Sophia Aristadou', created: '2026-08-08', dueDate: '2026-08-18', description: '<p>Add configurable lease renewal reminders to the property dashboard.</p>', tags: ['leases', 'notifications'] },
];

export const mockUsers: User[] = [
  { id: '1', name: 'Ahmed Khan', role: 'Backend Developer', email: 'ahmed@company.com', phone: '+92 301 100 1001', status: 'Active', workload: 82, skills: ['Node.js', 'PostgreSQL', 'Payments'] },
  { id: '2', name: 'Olivia Rhy', role: 'Product Designer', email: 'olivia@company.com', phone: '+92 301 100 1002', status: 'Active', workload: 64, skills: ['Figma', 'Research', 'Design systems'] },
  { id: '3', name: 'Phoenix Baker', role: 'Project Manager', email: 'phoenix@company.com', phone: '+92 301 100 1003', status: 'Active', workload: 71, skills: ['Delivery', 'Planning', 'Stakeholders'] },
  { id: '4', name: 'Lana Steiner', role: 'Frontend Developer', email: 'lana@company.com', phone: '+92 301 100 1004', status: 'Active', workload: 93, skills: ['React', 'TypeScript', 'Accessibility'] },
];

export const mockActivities: Activity[] = [
  { id: '1', timestamp: '10:20 AM', text: 'Created a new ticket for the payment receipt issue', user: 'Ahmed Khan', status: 'Open' },
  { id: '2', timestamp: '3 hours ago', text: 'Changed ticket priority to Critical', user: 'Phoenix Baker', status: 'Critical' },
  { id: '3', timestamp: 'Yesterday', text: 'Moved saved filters into development', user: 'Olivia Rhy', status: 'In Progress' },
  { id: '4', timestamp: '2 days ago', text: 'Added Lana Steiner to PBT Merchant Console', user: 'Phoenix Baker', status: 'Assigned' },
  { id: '5', timestamp: '3 days ago', text: 'Marked lease renewal reminders ready for review', user: 'Ahmed Khan', status: 'Ready for Review' },
];

export const mockNotifications: Notification[] = [
  { id: '1', category: 'Tickets', title: 'Ticket escalated', body: 'Payment receipt not downloading is now critical.', href: '/tickets/1', time: '8 min', unread: true },
  { id: '2', category: 'Mentions', title: 'Phoenix mentioned you', body: 'Can you review the settlement export findings?', href: '/tickets/2', time: '42 min', unread: true },
  { id: '3', category: 'Deadlines', title: 'Deadline approaching', body: 'PBT Merchant Console is due in five weeks.', href: '/projects/2', time: '2 hr', unread: true },
  { id: '4', category: 'System', title: 'Weekly report ready', body: 'Your delivery health report is ready to view.', href: '/', time: '1 day', unread: false },
];

export const mockRoles: Role[] = [
  { id: '1', name: 'Administrator', description: 'Full access to workspace settings, users, and delivery data.', users: 2, permissions: ['Manage users', 'Manage roles', 'Manage projects', 'Manage tickets', 'View reports'] },
  { id: '2', name: 'Project Manager', description: 'Plans projects and manages tickets, teams, and clients.', users: 4, permissions: ['Manage projects', 'Manage tickets', 'Manage clients', 'View reports'] },
  { id: '3', name: 'Contributor', description: 'Works on assigned tickets and participates in project activity.', users: 12, permissions: ['View projects', 'Update tickets', 'Add comments'] },
  { id: '4', name: 'Client', description: 'Read-only access to owned projects and shared tickets.', users: 7, permissions: ['View own projects', 'Create tickets', 'Add comments'] },
];

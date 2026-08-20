import type { Notification } from '@/types';



export const mockNotifications: Notification[] = [
  { id: '1', category: 'Tickets', title: 'Ticket escalated', body: 'Payment receipt not downloading is now critical.', href: '/tickets/1', time: '8 min', unread: true },
  { id: '2', category: 'Mentions', title: 'Phoenix mentioned you', body: 'Can you review the settlement export findings?', href: '/tickets/2', time: '42 min', unread: true },
  { id: '3', category: 'Deadlines', title: 'Deadline approaching', body: 'PBT Merchant Console is due in five weeks.', href: '/projects/2', time: '2 hr', unread: true },
  { id: '4', category: 'System', title: 'Weekly report ready', body: 'Your delivery health report is ready to view.', href: '/', time: '1 day', unread: false },
];

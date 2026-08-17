import { cn } from '@/lib/utils';
import type { Status } from '@/types';

export interface StatusBadgeProps { status: Status; size?: 'sm' | 'md' | 'lg' }

const colors: Record<Status, string> = {
  Active: 'bg-green-50 text-green-700 ring-green-600/20', 'On Track': 'bg-green-50 text-green-700 ring-green-600/20', Low: 'bg-green-50 text-green-700 ring-green-600/20',
  Critical: 'bg-red-50 text-red-700 ring-red-600/20', Overdue: 'bg-red-50 text-red-700 ring-red-600/20', Blocked: 'bg-red-50 text-red-700 ring-red-600/20', High: 'bg-red-50 text-red-700 ring-red-600/20',
  'In Progress': 'bg-yellow-50 text-yellow-700 ring-yellow-600/20', Medium: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  Open: 'bg-blue-50 text-blue-700 ring-blue-600/20', Assigned: 'bg-blue-50 text-blue-700 ring-blue-600/20', New: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  Paused: 'bg-slate-100 text-slate-600 ring-slate-500/20', Closed: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  'Ready for Review': 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full font-semibold ring-1 ring-inset', colors[status], size === 'sm' && 'px-2 py-0.5 text-xs', size === 'md' && 'px-2.5 py-1 text-xs', size === 'lg' && 'px-3 py-1.5 text-sm')}><span className="mr-1.5 size-1.5 rounded-full bg-current" />{status}</span>;
}

import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MetricCardProps { title: string; count: number; icon: ReactNode; trend?: number; bgColor?: string }

export default function MetricCard({ title, count, icon, trend, bgColor = 'bg-sky-50 text-sky-600' }: MetricCardProps) {
  const positive = (trend ?? 0) >= 0;
  return <article className="card p-5"><div className="flex items-start justify-between"><span className={cn('grid size-11 place-items-center rounded-xl', bgColor)}>{icon}</span>{trend !== undefined && <span className={cn('inline-flex items-center text-xs font-semibold', positive ? 'text-green-600' : 'text-red-600')}>{positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(trend)}%</span>}</div><p className="mt-5 text-sm font-medium text-slate-500">{title}</p><p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{count.toLocaleString()}</p></article>;
}

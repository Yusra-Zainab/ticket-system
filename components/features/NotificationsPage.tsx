'use client';

import Link from 'next/link';
import { Bell, CalendarClock, CheckCheck, Search, TicketCheck, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { cn } from '@/lib/utils';

const tabs = ['All', 'Tickets', 'Mentions', 'Deadlines', 'System'] as const;
const icons = { Tickets: TicketCheck, Mentions: UserRound, Deadlines: CalendarClock, System: Bell };

export default function NotificationsPage() {
  const { notifications, markRead, markAllRead } = useApp();
  const [tab, setTab] = useState<(typeof tabs)[number]>('All');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => notifications.filter((item) => (tab === 'All' || item.category === tab) && `${item.title} ${item.body}`.toLowerCase().includes(query.toLowerCase())), [notifications, query, tab]);
  return <div className="space-y-7">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-[2.35rem] font-bold tracking-tight text-slate-950">All Notifications</h1><button onClick={markAllRead} className="button-secondary"><CheckCheck size={17} />Mark all as read</button></div>
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 sm:flex-row sm:items-end"><div className="flex overflow-x-auto">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={cn('border-b-2 px-5 py-3 text-sm font-semibold', tab === item ? 'border-cyan-500 text-sky-600' : 'border-transparent text-slate-500')}>{item}</button>)}</div><label className="relative mb-2 w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="field pl-9" placeholder="Search notifications" /></label></div>
    <div className="overflow-hidden rounded-xl border border-slate-200">{filtered.map((item) => { const Icon = icons[item.category]; return <Link onClick={() => markRead(item.id)} key={item.id} href={item.href} className={cn('flex items-center gap-5 border-b border-slate-100 px-6 py-6 last:border-0 hover:bg-sky-50/40', item.unread && 'bg-sky-50/25')}><span className="grid size-12 shrink-0 place-items-center rounded-full bg-sky-50 text-sky-600"><Icon size={21} /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 font-semibold text-slate-900">{item.title}{item.unread && <i className="size-2 rounded-full bg-cyan-500" />}</span><span className="mt-1 block text-sm text-slate-500">{item.body}</span></span><time className="shrink-0 text-xs text-slate-400">{item.time} ago</time></Link>; })}{filtered.length === 0 && <p className="px-6 py-16 text-center text-sm text-slate-500">No notifications match this view.</p>}</div>
  </div>;
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, BriefcaseBusiness, Contact, LayoutDashboard, Search, SlidersHorizontal, TicketCheck, UserRound, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface FloatingActionBarProps { notificationsCount: number }

export default function FloatingActionBar({ notificationsCount }: FloatingActionBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searching, setSearching] = useState(false);
  const links = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/tickets', label: 'Tickets', icon: TicketCheck },
    { href: '/projects', label: 'Projects', icon: BriefcaseBusiness },
    { href: '/clients', label: 'Clients', icon: Contact },
    { href: '/resources', label: 'Resources', icon: UsersRound },
  ];
  return <nav aria-label="Quick navigation" className="floating-dock">
    <form className={cn('flex items-center transition-all', searching ? 'w-48' : 'w-11')} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); router.push(`/tickets?search=${encodeURIComponent(String(data.get('search') ?? ''))}`); }}>
      <button type="button" aria-label="Search" onClick={() => setSearching((value) => !value)} className="dock-action"><Search size={21} /></button>
      {searching && <input autoFocus name="search" aria-label="Search workspace" placeholder="Search" className="min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none" />}
    </form>
    <span className="dock-divider" />
    {links.map(({ href, label, icon: Icon }) => { const active = href === '/' ? pathname === '/' : pathname.startsWith(href); return <Link key={href} href={href} aria-label={label} className={cn('dock-action', active && 'dock-action-active')}><Icon size={21} /></Link>; })}
    <Link href="/admin/users" aria-label="Administration" className={cn('dock-action', pathname.startsWith('/admin') && 'dock-action-active')}><SlidersHorizontal size={21} /></Link>
    <span className="dock-divider" />
    <Link href="/dashboard/notifications" aria-label="Notifications" className={cn('dock-action relative', pathname.startsWith('/dashboard/notifications') && 'dock-action-active')}><Bell size={21} />{notificationsCount > 0 && <span className="notification-count">{notificationsCount}</span>}</Link>
    <Link href="/profile" aria-label="Profile" className={cn('dock-action', pathname.startsWith('/profile') && 'dock-action-active')}><UserRound size={21} /></Link>
  </nav>;
}

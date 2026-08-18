'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ChevronRight, Home, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { AppProvider, useApp } from '@/components/providers/AppProvider';
import FloatingActionBar from './FloatingActionBar';

export interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

const bareRoutes = ['/login', '/forgotPassword', '/errors'];

function Shell({ children, breadcrumbs }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { unreadCount } = useApp();
  if (bareRoutes.some((route) => pathname.startsWith(route))) return <>{children}</>;

  const parts = pathname.split('/').filter(Boolean);
  const crumbs = breadcrumbs ?? (pathname === '/tickets/drafts' ? [
    { label: 'Tickets', href: '/tickets' },
    { label: '…', href: undefined },
    { label: 'Ticket Drafts', href: undefined },
  ] : pathname === '/tickets/new' ? [
    { label: 'Tickets', href: '/tickets' },
    { label: '…', href: undefined },
    { label: 'Create Ticket', href: undefined },
  ] : parts[0] === 'tickets' && parts.length === 2 ? [
    { label: 'Tickets', href: '/tickets' },
    { label: '…', href: undefined },
    { label: 'Ticket Details', href: undefined },
  ] : parts.map((part, index) => ({
    label: part === 'new' ? `New ${parts[index - 1]?.replace(/s$/, '') ?? ''}` : part.replace(/-/g, ' ').replace(/^./, (letter) => letter.toUpperCase()),
    href: index < parts.length - 1 ? `/${parts.slice(0, index + 1).join('/')}` : undefined,
  })));

  return <div className="min-h-screen bg-white">
    <div className="mx-auto max-w-[1800px] px-5 pb-36 pt-7 sm:px-8 lg:px-12 xl:px-16">
      <nav aria-label="Breadcrumbs" className="mb-7 flex min-h-12 items-center gap-2.5 rounded-lg border-b border-[#0284C7]/10 px-3 py-2 text-sm font-semibold text-[#0284C7]">
        <Link href="/" aria-label="Dashboard" className="crumb-button text-sky-600"><Home size={17} /></Link>
        {crumbs.map((crumb) => <span className="flex items-center gap-2.5" key={`${crumb.label}-${crumb.href ?? 'current'}`}>
          <ChevronRight size={15} className="text-[#0284C7]" />
          {crumb.href ? <Link href={crumb.href} className="rounded-lg px-2 py-1.5 text-sky-600 hover:bg-sky-50">{crumb.label}</Link> : <span className="rounded-lg bg-sky-50 px-3 py-2 text-sky-600">{crumb.label || 'Dashboard'}</span>}
        </span>)}
        <span className="ml-2 flex overflow-hidden rounded-lg bg-sky-50 text-sky-600">
          <button aria-label="Go back" onClick={() => router.back()} className="crumb-button"><ArrowLeft size={17} /></button>
          <button aria-label="Go forward" onClick={() => router.forward()} className="crumb-button border-l border-white"><ArrowRight size={17} /></button>
        </span>
        <button aria-label="Refresh tickets" disabled={isRefreshing} onClick={() => { setIsRefreshing(true); router.refresh(); window.setTimeout(() => setIsRefreshing(false), 1500); }} className="crumb-button ml-1 text-[#0284C7]"><RotateCw size={17} className={isRefreshing ? 'animate-spin' : ''} /></button>
      </nav>
      <main>{children}</main>
    </div>
    <FloatingActionBar notificationsCount={unreadCount} />
  </div>;
}

export default function AppLayout(props: AppLayoutProps) {
  return <AppProvider><Shell {...props} /></AppProvider>;
}

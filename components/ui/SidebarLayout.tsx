import { cn } from '@/lib/utils';
export interface SidebarLayoutProps { children: React.ReactNode; sidebar: React.ReactNode; sidebarWidth?: 'sm' | 'md' | 'lg' }
export default function SidebarLayout({ children, sidebar, sidebarWidth = 'md' }: SidebarLayoutProps) { return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_var(--side)]" style={{ '--side': sidebarWidth === 'sm' ? '240px' : sidebarWidth === 'lg' ? '380px' : '320px' } as React.CSSProperties}><div className="min-w-0">{children}</div><aside className={cn('min-w-0')}>{sidebar}</aside></div>; }

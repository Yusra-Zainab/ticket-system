"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  FileText,
  FolderKanban,
  Gauge,
  LogOut,
  TicketCheck,
  UserRound,
} from "lucide-react";

const nav = [
  { href: "/resource/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/resource/projects", label: "Projects", icon: FolderKanban },
  { href: "/resource/tickets", label: "Tickets", icon: TicketCheck },
  { href: "/resource/tickets/drafts", label: "Drafts", icon: FileText },
  { href: "/resource/notifications", label: "Notifications", icon: Bell },
  { href: "/resource/profile", label: "Profile", icon: UserRound },
];

export default function ResourcePortalShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="rp-shell">
      <header className="rp-shell-topbar">
        <Link href="/resource/dashboard" className="rp-brand">
          <span className="rp-brand-mark">TS</span>
          <span>Resource Portal</span>
        </Link>
        <div className="rp-shell-user">
          <span>{userName}</span>
          <button type="button" onClick={logout} className="rp-icon-button" aria-label="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="rp-shell-main">{children}</main>

      <nav className="rp-dock" aria-label="Resource portal navigation">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/resource/dashboard" && pathname.startsWith(`${item.href}/`));
          return (
            <Link key={item.href} href={item.href} className={active ? "rp-dock-link is-active" : "rp-dock-link"} title={item.label}>
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

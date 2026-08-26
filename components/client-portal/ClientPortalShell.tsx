"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ClientFloatingActionBar from "@/components/client-portal/ClientFloatingActionBar";
import { useApp } from "@/components/providers/AppProvider";
import {
  Bell,
  FileText,
  FolderKanban,
  Gauge,
  LogOut,
  TicketCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

const nav = [
  { href: "/client/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/client/projects", label: "Projects", icon: FolderKanban },
  { href: "/client/tickets", label: "Tickets", icon: TicketCheck },
  { href: "/client/tickets/drafts", label: "Drafts", icon: FileText },
  { href: "/client/team", label: "Team", icon: UsersRound },
  { href: "/client/notifications", label: "Notifications", icon: Bell },
  { href: "/client/profile", label: "Profile", icon: UserRound },
];

export default function ClientPortalShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCount } = useApp();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="cp-shell">
      <header className="cp-shell-topbar">
        <Link href="/client/dashboard" className="cp-brand">
          <span className="cp-brand-mark">TS</span>
          <span>Support Portal</span>
        </Link>
        <div className="cp-shell-user">
          <span>{userName}</span>
          <button type="button" onClick={logout} className="cp-icon-button" aria-label="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="cp-shell-main">{children}</main>

      <ClientFloatingActionBar notificationsCount={unreadCount} />
    </div>
  );
}

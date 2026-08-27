import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppLayout from '@/components/ui/AppLayout';
import { getSessionUser, isAdminRole } from '@/lib/auth';
import { listAdminNotifications } from '@/lib/db';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Support Portal | Ticket System",
  description: "Track tickets, manage priorities, and collaborate with your team in one place.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser().catch(() => null);
  const notifications = user && isAdminRole(user.role)
    ? await listAdminNotifications().catch(() => [])
    : [];

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50">
        <AppLayout
          notifications={notifications}
          notificationStorageKey={user ? "app-notification-read-ids:" + user.id : undefined}
        >
          {children}
        </AppLayout>
      </body>
    </html>
  );
}

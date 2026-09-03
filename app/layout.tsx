import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import localFont from "next/font/local";
import AppLayout from '@/components/ui/AppLayout';
import { getSessionUser, isAdminRole } from '@/lib/auth';
import { listAdminNotifications } from '@/lib/db';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const satoshi = localFont({
  variable: "--font-satoshi",
  display: "swap",
  src: [
    { path: "../public/fonts/Satoshi-Variable.woff2", style: "normal" },
    { path: "../public/fonts/Satoshi-VariableItalic.woff2", style: "italic" },
  ],
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
      className={`${inter.variable} ${geist.variable} ${satoshi.variable} h-full antialiased`}
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

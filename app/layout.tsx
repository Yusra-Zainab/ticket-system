import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppLayout from '@/components/ui/AppLayout';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Support Portal | Ticket System",
  description: "Track tickets, manage priorities, and collaborate with your team in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}

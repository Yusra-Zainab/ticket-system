"use client";

import Link from "next/link";
import {
  AtSign,
  CalendarDays,
  CircleAlert,
  ListChecks,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  type ResourceNotificationView,
  useResourceNotifications,
} from "@/components/providers/ResourceNotificationsProvider";
import { cn } from "@/lib/utils";

const tabs = ["All", "Tickets", "Mentions", "Deadlines", "System"] as const;

type NotificationTab = (typeof tabs)[number];

const notificationIcons = {
  Tickets: ListChecks,
  Mentions: AtSign,
  Deadlines: CalendarDays,
  System: CircleAlert,
};

export default function ResourceNotificationPopover({
  onClose,
}: {
  onClose?: () => void;
}) {
  const { notifications, unreadCount, markRead, markAllRead } =
    useResourceNotifications();
  const [tab, setTab] = useState<NotificationTab>("All");

  const visible = useMemo(
    () =>
      notifications
        .filter((item) => tab === "All" || item.category === tab)
        .slice(0, 4),
    [notifications, tab],
  );

  return (
    <section
      id="resource-notification-popover"
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      className="notification-popover"
    >
      <header className="notification-popover-header">
        <h2>Notifications</h2>

        <button
          type="button"
          onClick={markAllRead}
          className="notification-text-button"
        >
          Mark All As Read
        </button>
      </header>

      <div className="notification-tabs">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "notification-tab",
              tab === item && "notification-tab-active",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="notification-popover-list">
        {visible.map((item) => (
          <ResourceNotificationRow
            key={item.id}
            item={item}
            compact
            onOpen={() => {
              markRead(item.id);
              onClose?.();
            }}
          />
        ))}

        {visible.length === 0 ? (
          <p className="notification-empty">
            {tab === "All" && unreadCount === 0
              ? "No new notifications."
              : "No notifications in this category."}
          </p>
        ) : null}
      </div>

      <footer className="notification-popover-footer">
        <Link
          href="/resource-portal/notifications"
          onClick={onClose}
          className="notification-text-button"
        >
          View All Notifications
        </Link>
      </footer>
    </section>
  );
}

export function ResourceNotificationRow({
  item,
  compact = false,
  onOpen,
}: {
  item: ResourceNotificationView;
  compact?: boolean;
  onOpen?: () => void;
}) {
  const Icon = notificationIcons[item.category];

  return (
    <Link
      href={item.href}
      onClick={onOpen}
      className={cn(
        "notification-row",
        compact && "notification-row-compact",
        item.unread && "notification-row-unread",
      )}
    >
      <span className="notification-row-icon" aria-hidden="true">
        <Icon size={24} strokeWidth={2} />
      </span>

      <span className="notification-row-copy">
        <span className="notification-row-topline">
          <span className="notification-row-title-wrap">
            <strong className="notification-row-title">{item.title}</strong>

            {item.unread ? (
              <span className="notification-new-badge">New</span>
            ) : null}
          </span>

          <time className="notification-row-time" dateTime={item.time}>
            {formatNotificationTime(item.time)}
          </time>
        </span>

        <span className="notification-row-body">{item.body}</span>
      </span>
    </Link>
  );
}

function formatNotificationTime(value: string) {
  const normalized = value.trim();

  if (normalized.toLowerCase().endsWith("ago")) {
    return normalized;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return normalized;

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
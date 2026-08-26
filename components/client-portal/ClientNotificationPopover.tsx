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
  type ClientNotificationView,
  useClientNotifications,
} from "@/components/providers/ClientNotificationsProvider";
import { cn } from "@/lib/utils";

const tabs = [
  "All",
  "Tickets",
  "Mentions",
  "Deadlines",
  "System",
] as const;

type NotificationTab = (typeof tabs)[number];

const notificationIcons = {
  Tickets: ListChecks,
  Mentions: AtSign,
  Deadlines: CalendarDays,
  System: CircleAlert,
};

export default function ClientNotificationPopover({
  onClose,
}: {
  onClose?: () => void;
}) {
  const {
    notifications,
    markRead,
    markAllRead,
  } = useClientNotifications();

  const [tab, setTab] =
    useState<NotificationTab>("All");

  const visible = useMemo(
    () =>
      notifications
        .filter(
          (item) =>
            tab === "All" ||
            item.category === tab,
        )
        .slice(0, 4),
    [notifications, tab],
  );

  const unreadCount = notifications.filter(
    (item) => item.unread,
  ).length;

  return (
    <>
      <style>{`
        /*
         * The Admin globals.css export uses "size: 40px" for this
         * element in one revision. Width/height are supplied here so
         * the rendered Client row matches the intended Admin 40px icon.
         */
        .notification-row-icon {
          width: 40px;
          height: 40px;
        }
      `}</style>

      <section
        id="notification-popover"
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
                tab === item &&
                  "notification-tab-active",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="notification-popover-list">
          {visible.map((item) => (
            <ClientNotificationRow
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
            href="/client-portal/notifications"
            onClick={onClose}
            className="notification-text-button"
          >
            View All Notifications
          </Link>
        </footer>
      </section>
    </>
  );
}

export function ClientNotificationRow({
  item,
  compact = false,
  onOpen,
}: {
  item: ClientNotificationView;
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
      <span
        className="notification-row-icon"
        aria-hidden="true"
      >
        <Icon size={24} strokeWidth={2} />
      </span>

      <span className="notification-row-copy">
        <span className="notification-row-topline">
          <span className="notification-row-title-wrap">
            <strong className="notification-row-title">
              {item.title}
            </strong>

            {item.unread ? (
              <span className="notification-new-badge">
                New
              </span>
            ) : null}
          </span>

          <time className="notification-row-time">
            {formatNotificationTime(item.time)}
          </time>
        </span>

        <span className="notification-row-body">
          {item.body}
        </span>
      </span>
    </Link>
  );
}

export function formatNotificationTime(
  value: string,
) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.toLowerCase().endsWith("ago")) {
    return trimmed;
  }

  const date = new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    return trimmed;
  }

  const difference = Date.now() - date.getTime();

  if (difference < 60_000) {
    return "Just now";
  }

  if (difference < 3_600_000) {
    return `${Math.max(
      1,
      Math.floor(difference / 60_000),
    )}m ago`;
  }

  if (difference < 86_400_000) {
    return `${Math.max(
      1,
      Math.floor(difference / 3_600_000),
    )}h ago`;
  }

  if (difference < 604_800_000) {
    return `${Math.max(
      1,
      Math.floor(difference / 86_400_000),
    )}d ago`;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

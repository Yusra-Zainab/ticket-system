"use client";

import Link from "next/link";
import {
  AtSign,
  CalendarDays,
  CircleAlert,
  ListChecks,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useApp } from "@/components/providers/AppProvider";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

const tabs = [
  "All",
  "Tickets",
  "Mentions",
  "Deadlines",
  "System",
] as const;

type NotificationTab =
  (typeof tabs)[number];

const notificationIcons = {
  Tickets: ListChecks,
  Mentions: AtSign,
  Deadlines: CalendarDays,
  System: CircleAlert,
};

export default function NotificationPopover({
  onClose,
}: {
  onClose?: () => void;
}) {
  const {
    notifications,
    markRead,
    markAllRead,
  } = useApp();

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

  return (
    <section
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
            onClick={() =>
              setTab(item)
            }
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
          <NotificationRow
            key={item.id}
            item={item}
            compact
            onOpen={() => {
              markRead(item.id);
              onClose?.();
            }}
          />
        ))}

        {visible.length === 0 && (
          <p className="notification-empty">
            No notifications in this
            category.
          </p>
        )}
      </div>

      <footer className="notification-popover-footer">
        <Link
          href="/notifications"
          onClick={onClose}
          className="notification-text-button"
        >
          View All Notifications
        </Link>
      </footer>
    </section>
  );
}

export function NotificationRow({
  item,
  compact = false,
  onOpen,
}: {
  item: Notification;
  compact?: boolean;
  onOpen?: () => void;
}) {
  const Icon =
    notificationIcons[
      item.category
    ];

  return (
    <Link
      href={item.href}
      onClick={onOpen}
      className={cn(
        "notification-row",
        compact &&
          "notification-row-compact",
        item.unread &&
          "notification-row-unread",
      )}
    >
      <span
        className="notification-row-icon"
        aria-hidden="true"
      >
        <Icon
          size={24}
          strokeWidth={2}
        />
      </span>

      <span className="notification-row-copy">
        <span className="notification-row-topline">
          <span className="notification-row-title-wrap">
            <strong className="notification-row-title">
              {item.title}
            </strong>

            {item.unread && (
              <span className="notification-new-badge">
                New
              </span>
            )}
          </span>

          <time className="notification-row-time">
            {formatTime(
              item.time,
            )}
          </time>
        </span>

        <span className="notification-row-body">
          {item.body}
        </span>
      </span>
    </Link>
  );
}

function formatTime(
  value: string,
) {
  if (
    value
      .trim()
      .toLowerCase()
      .endsWith("ago")
  ) {
    return value;
  }

  return `${value} ago`;
}
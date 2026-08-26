"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import type { ResourcePortalNotification } from "@/types/resourcePortal";

export type ResourceNotificationCategory =
  | "Tickets"
  | "Mentions"
  | "Deadlines"
  | "System";

export type ResourceNotificationView = ResourcePortalNotification & {
  category: ResourceNotificationCategory;
  unread: boolean;
};

type ResourceNotificationsContextValue = {
  notifications: ResourceNotificationView[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const ResourceNotificationsContext =
  createContext<ResourceNotificationsContextValue | null>(null);

const READ_STATE_EVENT = "resource-notification-read-state-change";
const EMPTY_READ_STATE = "[]";

function inferCategory(
  item: ResourcePortalNotification,
): ResourceNotificationCategory {
  const text = `${item.title} ${item.body}`.toLowerCase();

  if (item.href.startsWith("/resource/tickets")) {
    return "Tickets";
  }

  if (text.includes("mention") || text.includes("mentioned you")) {
    return "Mentions";
  }

  if (
    text.includes("deadline") ||
    text.includes("due date") ||
    text.includes("overdue")
  ) {
    return "Deadlines";
  }

  return "System";
}

function parseReadIds(value: string): Set<string> {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(
      parsed.filter((item): item is string => typeof item === "string"),
    );
  } catch {
    return new Set();
  }
}

function readStoredSnapshot(storageKey: string) {
  if (typeof window === "undefined") {
    return EMPTY_READ_STATE;
  }

  try {
    return window.localStorage.getItem(storageKey) ?? EMPTY_READ_STATE;
  } catch {
    return EMPTY_READ_STATE;
  }
}

function writeStoredSnapshot(storageKey: string, readIds: Set<string>) {
  if (typeof window === "undefined") return;

  try {
    const nextValue = JSON.stringify([...readIds]);
    const currentValue =
      window.localStorage.getItem(storageKey) ?? EMPTY_READ_STATE;

    if (currentValue === nextValue) {
      return;
    }

    window.localStorage.setItem(storageKey, nextValue);

    window.dispatchEvent(
      new CustomEvent(READ_STATE_EVENT, {
        detail: { storageKey },
      }),
    );
  } catch {
    // Read-state persistence is best-effort only.
  }
}

export default function ResourceNotificationsProvider({
  children,
  items,
  storageKey = "resource-notification-read-ids",
}: {
  children: React.ReactNode;
  items: ResourcePortalNotification[];
  storageKey?: string;
}) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      function handleStorage(event: StorageEvent) {
        if (event.key === storageKey) {
          onStoreChange();
        }
      }

      function handleLocalChange(event: Event) {
        const customEvent = event as CustomEvent<{ storageKey?: string }>;

        if (customEvent.detail?.storageKey === storageKey) {
          onStoreChange();
        }
      }

      window.addEventListener("storage", handleStorage);
      window.addEventListener(READ_STATE_EVENT, handleLocalChange);

      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(READ_STATE_EVENT, handleLocalChange);
      };
    },
    [storageKey],
  );

  const getSnapshot = useCallback(
    () => readStoredSnapshot(storageKey),
    [storageKey],
  );

  /*
   * localStorage is an external browser store, so useSyncExternalStore is the
   * correct React primitive here. This avoids calling setState synchronously
   * from an effect and also gives Next.js a stable server snapshot for hydration.
   */
  const storedReadIds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => EMPTY_READ_STATE,
  );

  const readIds = useMemo(
    () => parseReadIds(storedReadIds),
    [storedReadIds],
  );

  const markRead = useCallback(
    (id: string) => {
      const next = parseReadIds(readStoredSnapshot(storageKey));

      if (next.has(id)) {
        return;
      }

      next.add(id);
      writeStoredSnapshot(storageKey, next);
    },
    [storageKey],
  );

  const markAllRead = useCallback(() => {
    const next = parseReadIds(readStoredSnapshot(storageKey));
    let changed = false;

    items.forEach((item) => {
      if (!next.has(item.id)) {
        next.add(item.id);
        changed = true;
      }
    });

    if (changed) {
      writeStoredSnapshot(storageKey, next);
    }
  }, [items, storageKey]);

  const notifications = useMemo<ResourceNotificationView[]>(
    () =>
      items.map((item) => ({
        ...item,
        category: inferCategory(item),
        unread: !readIds.has(item.id),
      })),
    [items, readIds],
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.unread).length,
    [notifications],
  );

  const value = useMemo<ResourceNotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      markRead,
      markAllRead,
    }),
    [notifications, unreadCount, markRead, markAllRead],
  );

  return (
    <ResourceNotificationsContext.Provider value={value}>
      {children}
    </ResourceNotificationsContext.Provider>
  );
}

export function useResourceNotifications() {
  const context = useContext(ResourceNotificationsContext);

  if (!context) {
    throw new Error(
      "useResourceNotifications must be used inside ResourceNotificationsProvider.",
    );
  }

  return context;
}
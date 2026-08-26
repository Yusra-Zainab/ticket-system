"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import type { ClientPortalNotification } from "@/types/clientPortal";

export type ClientNotificationCategory =
  | "Tickets"
  | "Mentions"
  | "Deadlines"
  | "System";

export type ClientNotificationView = ClientPortalNotification & {
  category: ClientNotificationCategory;
  unread: boolean;
};

type ClientNotificationsContextValue = {
  notifications: ClientNotificationView[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const ClientNotificationsContext =
  createContext<ClientNotificationsContextValue | null>(null);

const READ_STATE_EVENT = "client-notification-read-state-change";
const EMPTY_READ_STATE = "[]";

function inferCategory(
  notification: ClientPortalNotification,
): ClientNotificationCategory {
  const text = `${notification.title} ${notification.body}`.toLowerCase();

  if (
    text.includes("mention") ||
    text.includes("mentioned you") ||
    text.includes("@")
  ) {
    return "Mentions";
  }

  if (
    text.includes("deadline") ||
    text.includes("due date") ||
    text.includes("overdue") ||
    text.includes("due ")
  ) {
    return "Deadlines";
  }

  if (
    text.includes("system") ||
    text.includes("security") ||
    text.includes("password") ||
    text.includes("login")
  ) {
    return "System";
  }

  if (notification.href.startsWith("/client-portal/tickets")) {
    return "Tickets";
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
      parsed.filter(
        (item): item is string => typeof item === "string",
      ),
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
    return (
      window.localStorage.getItem(storageKey) ??
      EMPTY_READ_STATE
    );
  } catch {
    return EMPTY_READ_STATE;
  }
}

function writeStoredSnapshot(
  storageKey: string,
  readIds: Set<string>,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const nextValue = JSON.stringify(
      [...readIds].sort((a, b) => a.localeCompare(b)),
    );

    const currentValue =
      window.localStorage.getItem(storageKey) ??
      EMPTY_READ_STATE;

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
    // Notification read persistence is best-effort.
  }
}

export default function ClientNotificationsProvider({
  items,
  storageKey,
  children,
}: {
  items: ClientPortalNotification[];
  storageKey: string;
  children: React.ReactNode;
}) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      function handleStorage(event: StorageEvent) {
        if (event.key === storageKey) {
          onStoreChange();
        }
      }

      function handleLocalChange(event: Event) {
        const customEvent = event as CustomEvent<{
          storageKey?: string;
        }>;

        if (
          customEvent.detail?.storageKey === storageKey
        ) {
          onStoreChange();
        }
      }

      window.addEventListener("storage", handleStorage);
      window.addEventListener(
        READ_STATE_EVENT,
        handleLocalChange,
      );

      return () => {
        window.removeEventListener(
          "storage",
          handleStorage,
        );
        window.removeEventListener(
          READ_STATE_EVENT,
          handleLocalChange,
        );
      };
    },
    [storageKey],
  );

  const getSnapshot = useCallback(
    () => readStoredSnapshot(storageKey),
    [storageKey],
  );

  const storedReadIds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => EMPTY_READ_STATE,
  );

  const readIds = useMemo(
    () => parseReadIds(storedReadIds),
    [storedReadIds],
  );

  const notifications = useMemo<ClientNotificationView[]>(
    () =>
      items.map((item) => ({
        ...item,
        category: inferCategory(item),
        unread: !readIds.has(item.id),
      })),
    [items, readIds],
  );

  const unreadCount = useMemo(
    () =>
      notifications.filter((item) => item.unread)
        .length,
    [notifications],
  );

  const markRead = useCallback(
    (id: string) => {
      const next = parseReadIds(
        readStoredSnapshot(storageKey),
      );

      if (next.has(id)) {
        return;
      }

      next.add(id);
      writeStoredSnapshot(storageKey, next);
    },
    [storageKey],
  );

  const markAllRead = useCallback(() => {
    const next = parseReadIds(
      readStoredSnapshot(storageKey),
    );

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

  const value = useMemo<ClientNotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      markRead,
      markAllRead,
    }),
    [
      notifications,
      unreadCount,
      markRead,
      markAllRead,
    ],
  );

  return (
    <ClientNotificationsContext.Provider value={value}>
      {children}
    </ClientNotificationsContext.Provider>
  );
}

export function useClientNotifications() {
  const value = useContext(ClientNotificationsContext);

  if (!value) {
    throw new Error(
      "useClientNotifications must be used inside ClientNotificationsProvider.",
    );
  }

  return value;
}

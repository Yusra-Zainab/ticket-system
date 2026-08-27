'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import type { Notification, Ticket } from '@/types';

interface AppContextValue {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  draftTickets: Ticket[];
  submittedTickets: Ticket[];
  saveDraft: (ticket: Ticket) => Promise<void>;
  submitTicket: (ticket: Ticket) => Promise<void>;
  removeStoredTicket: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const READ_STATE_EVENT = 'app-notification-read-state-change';
const EMPTY_READ_STATE = '[]';

function parseReadIds(value: string): Set<string> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return new Set();
  }
}

function readStoredSnapshot(storageKey: string) {
  if (typeof window === 'undefined') return EMPTY_READ_STATE;
  try {
    return window.localStorage.getItem(storageKey) ?? EMPTY_READ_STATE;
  } catch {
    return EMPTY_READ_STATE;
  }
}

function writeStoredSnapshot(storageKey: string, readIds: Set<string>) {
  if (typeof window === 'undefined') return;

  try {
    const nextValue = JSON.stringify([...readIds].sort((a, b) => a.localeCompare(b)));
    const currentValue = window.localStorage.getItem(storageKey) ?? EMPTY_READ_STATE;
    if (currentValue === nextValue) return;

    window.localStorage.setItem(storageKey, nextValue);
    window.dispatchEvent(new CustomEvent(READ_STATE_EVENT, { detail: { storageKey } }));
  } catch {
    // Notification read persistence is best-effort.
  }
}

export function AppProvider({
  children,
  initialNotifications = [],
  notificationStorageKey = 'app-notification-read-ids',
}: {
  children: React.ReactNode;
  initialNotifications?: Notification[];
  notificationStorageKey?: string;
}) {
  const readTickets = (key: string) => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(key) ?? '[]') as Ticket[];
    } catch {
      return [];
    }
  };

  const [draftTickets, setDraftTickets] = useState<Ticket[]>(() => readTickets('ticket-drafts'));
  const [submittedTickets, setSubmittedTickets] = useState<Ticket[]>(() => readTickets('submitted-tickets'));
  const updateDrafts = (update: (items: Ticket[]) => Ticket[]) => setDraftTickets((items) => {
    const next = update(items);
    localStorage.setItem('ticket-drafts', JSON.stringify(next));
    return next;
  });
  const updateSubmitted = (update: (items: Ticket[]) => Ticket[]) => setSubmittedTickets((items) => {
    const next = update(items);
    localStorage.setItem('submitted-tickets', JSON.stringify(next));
    return next;
  });

  const postTicket = async (ticket: Ticket, state: 'draft' | 'open') => {
    const response = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket, state }),
    });

    if (response.ok) return;

    let message = 'Unable to ' + (state === 'draft' ? 'save draft' : 'submit ticket') + ' to MySQL.';
    try {
      const data = await response.json();
      if (typeof data?.error === 'string') message = data.error;
      if (typeof data?.details?.formErrors?.[0] === 'string') message = data.details.formErrors[0];
    } catch {
      // Keep the generic message when the server does not return JSON.
    }
    throw new Error(message);
  };

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      function handleStorage(event: StorageEvent) {
        if (event.key === notificationStorageKey) onStoreChange();
      }

      function handleLocalChange(event: Event) {
        const customEvent = event as CustomEvent<{ storageKey?: string }>;
        if (customEvent.detail?.storageKey === notificationStorageKey) onStoreChange();
      }

      window.addEventListener('storage', handleStorage);
      window.addEventListener(READ_STATE_EVENT, handleLocalChange);
      return () => {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener(READ_STATE_EVENT, handleLocalChange);
      };
    },
    [notificationStorageKey],
  );

  const getSnapshot = useCallback(
    () => readStoredSnapshot(notificationStorageKey),
    [notificationStorageKey],
  );

  const storedReadIds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => EMPTY_READ_STATE,
  );

  const readIds = useMemo(() => parseReadIds(storedReadIds), [storedReadIds]);
  const notifications = useMemo(
    () => initialNotifications.map((item) => ({ ...item, unread: !readIds.has(item.id) })),
    [initialNotifications, readIds],
  );

  const markRead = useCallback(
    (id: string) => {
      const next = parseReadIds(readStoredSnapshot(notificationStorageKey));
      if (next.has(id)) return;
      next.add(id);
      writeStoredSnapshot(notificationStorageKey, next);
    },
    [notificationStorageKey],
  );

  const markAllRead = useCallback(() => {
    const next = parseReadIds(readStoredSnapshot(notificationStorageKey));
    let changed = false;

    initialNotifications.forEach((item) => {
      if (!next.has(item.id)) {
        next.add(item.id);
        changed = true;
      }
    });

    if (changed) writeStoredSnapshot(notificationStorageKey, next);
  }, [initialNotifications, notificationStorageKey]);

  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter((item) => item.unread).length,
    markRead,
    markAllRead,
    draftTickets,
    submittedTickets,
    saveDraft: async (ticket: Ticket) => {
      await postTicket(ticket, 'draft');
      updateDrafts((items) => [ticket, ...items.filter((item) => item.id !== ticket.id)]);
    },
    submitTicket: async (ticket: Ticket) => {
      const openTicket = { ...ticket, status: 'Open' as const };
      await postTicket(openTicket, 'open');
      updateSubmitted((items) => [openTicket, ...items.filter((item) => item.id !== ticket.id)]);
      updateDrafts((items) => items.filter((item) => item.id !== ticket.id));
    },
    removeStoredTicket: async (id: string) => {
      const response = await fetch('/api/tickets/' + encodeURIComponent(id), { method: 'DELETE' });
      if (!response.ok && response.status !== 404) throw new Error('Unable to delete ticket.');
      updateDrafts((items) => items.filter((item) => item.id !== id));
      updateSubmitted((items) => items.filter((item) => item.id !== id));
    },
  }), [notifications, markRead, markAllRead, draftTickets, submittedTickets]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

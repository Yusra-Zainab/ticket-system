'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { mockNotifications } from '@/data/mockData';
import type { Notification } from '@/types';

interface AppContextValue {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState(mockNotifications);
  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter((item) => item.unread).length,
    markRead: (id: string) => setNotifications((items) => items.map((item) => item.id === id ? { ...item, unread: false } : item)),
    markAllRead: () => setNotifications((items) => items.map((item) => ({ ...item, unread: false }))),
  }), [notifications]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

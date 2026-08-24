'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { mockNotifications } from '@/data/mockData';
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const readTickets = (key: string) => { if (typeof window === 'undefined') return []; try { return JSON.parse(localStorage.getItem(key) ?? '[]') as Ticket[]; } catch { return []; } };
  const [draftTickets, setDraftTickets] = useState<Ticket[]>(() => readTickets('ticket-drafts'));
  const [submittedTickets, setSubmittedTickets] = useState<Ticket[]>(() => readTickets('submitted-tickets'));
  const updateDrafts = (update: (items: Ticket[]) => Ticket[]) => setDraftTickets((items) => { const next = update(items); localStorage.setItem('ticket-drafts', JSON.stringify(next)); return next; });
  const updateSubmitted = (update: (items: Ticket[]) => Ticket[]) => setSubmittedTickets((items) => { const next = update(items); localStorage.setItem('submitted-tickets', JSON.stringify(next)); return next; });
  const postTicket = async (ticket: Ticket, state: 'draft' | 'open') => {
    const response = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket, state }),
    });
    if (response.ok) return;
    let message = `Unable to ${state === 'draft' ? 'save draft' : 'submit ticket'} to MySQL.`;
    try {
      const data = await response.json();
      if (typeof data?.error === 'string') message = data.error;
      if (typeof data?.details?.formErrors?.[0] === 'string') message = data.details.formErrors[0];
    } catch {
      // Keep the generic message when the server does not return JSON.
    }
    throw new Error(message);
  };
  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter((item) => item.unread).length,
    markRead: (id: string) => setNotifications((items) => items.map((item) => item.id === id ? { ...item, unread: false } : item)),
    markAllRead: () => setNotifications((items) => items.map((item) => ({ ...item, unread: false }))),
    draftTickets,
    submittedTickets,
    saveDraft: async (ticket: Ticket) => { await postTicket(ticket, 'draft'); updateDrafts((items) => [ticket, ...items.filter((item) => item.id !== ticket.id)]); },
    submitTicket: async (ticket: Ticket) => { const openTicket = { ...ticket, status: 'Open' as const }; await postTicket(openTicket, 'open'); updateSubmitted((items) => [openTicket, ...items.filter((item) => item.id !== ticket.id)]); updateDrafts((items) => items.filter((item) => item.id !== ticket.id)); },
    removeStoredTicket: async (id: string) => { const response = await fetch(`/api/tickets/${id}`, { method: 'DELETE' }); if (!response.ok && response.status !== 404) throw new Error('Unable to delete ticket.'); updateDrafts((items) => items.filter((item) => item.id !== id)); updateSubmitted((items) => items.filter((item) => item.id !== id)); },
  }), [notifications, draftTickets, submittedTickets]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

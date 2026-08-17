import { mockClients, mockProjects, mockTickets, mockUsers } from '@/data/mockData';

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  async projects() { await delay(); return structuredClone(mockProjects); },
  async tickets() { await delay(); return structuredClone(mockTickets); },
  async clients() { await delay(); return structuredClone(mockClients); },
  async resources() { await delay(); return structuredClone(mockUsers); },
  async submit<T>(resource: string, payload: T) {
    await delay(450);
    if (!resource) throw new Error('A resource is required.');
    return { id: crypto.randomUUID(), ...payload };
  },
};

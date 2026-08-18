export const api = {
  async projects() { return request('/api/projects'); },
  async tickets() { return request('/api/tickets'); },
  async clients() { return request('/api/clients'); },
  async resources() { return request('/api/users'); },
  async submit<T>(resource: string, payload: T) {
    if (!resource) throw new Error('A resource is required.');
    return request(`/api/${resource}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  },
};

async function request(url: string, init?: RequestInit) { const response = await fetch(url, init); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Request failed'); return body; }

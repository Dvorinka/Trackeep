const SOLIDTIME_BASE_URL = 'https://api.solidtime.io';

function getStoredCredentials() {
  const apiKey = localStorage.getItem('solidtime_api_key') || '';
  const orgId = localStorage.getItem('solidtime_org_id') || '';
  return { apiKey, orgId };
}

async function solidtimeFetch(path: string, options: RequestInit = {}) {
  const { apiKey, orgId } = getStoredCredentials();
  if (!apiKey || !orgId) {
    throw new Error('Solidtime API credentials not configured');
  }

  const url = `${SOLIDTIME_BASE_URL}/api/v1/organizations/${orgId}${path}`;
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Solidtime API error: ${response.status} ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export const solidtimeApi = {
  getTimeEntries: async (params?: { start?: string; end?: string; active?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.start) query.set('start', params.start);
    if (params?.end) query.set('end', params.end);
    if (params?.active) query.set('active', 'true');
    const queryString = query.toString();
    const data = await solidtimeFetch(`/time-entries${queryString ? `?${queryString}` : ''}`);
    return data?.data || [];
  },

  getActiveTimeEntry: async () => {
    const data = await solidtimeFetch('/time-entries?active=true');
    return data?.data?.[0] || null;
  },

  startTimeEntry: async (payload: { description?: string; project_id?: string; task_id?: string; tags?: string[]; billable?: boolean }) => {
    const data = await solidtimeFetch('/time-entries', {
      method: 'POST',
      body: JSON.stringify({
        start: new Date().toISOString(),
        ...payload,
      }),
    });
    return data?.data;
  },

  stopTimeEntry: async (id: string) => {
    const data = await solidtimeFetch(`/time-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        end: new Date().toISOString(),
      }),
    });
    return data?.data;
  },

  updateTimeEntry: async (id: string, payload: { description?: string; project_id?: string; task_id?: string; tags?: string[]; billable?: boolean; start?: string; end?: string }) => {
    const data = await solidtimeFetch(`/time-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return data?.data;
  },

  deleteTimeEntry: async (id: string) => {
    await solidtimeFetch(`/time-entries/${id}`, { method: 'DELETE' });
  },

  getTimeEntriesStats: async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entries = await solidtimeApi.getTimeEntries({
      start: today.toISOString(),
    });

    let total = 0;
    let billable = 0;
    let nonBillable = 0;

    entries.forEach((entry: any) => {
      const start = new Date(entry.start).getTime();
      const end = entry.end ? new Date(entry.end).getTime() : Date.now();
      const duration = Math.floor((end - start) / 1000);
      total += duration;
      if (entry.billable) {
        billable += duration;
      } else {
        nonBillable += duration;
      }
    });

    return { total, billable, nonBillable };
  },

  getProjects: async () => {
    const data = await solidtimeFetch('/projects');
    return data?.data || [];
  },

  getMembers: async () => {
    const data = await solidtimeFetch('/members');
    return data?.data || [];
  },

  getTasks: async () => {
    const data = await solidtimeFetch('/tasks');
    return data?.data || [];
  },

  getTags: async () => {
    const data = await solidtimeFetch('/tags');
    return data?.data || [];
  },

  setCredentials: (apiKey: string, orgId: string) => {
    localStorage.setItem('solidtime_api_key', apiKey);
    localStorage.setItem('solidtime_org_id', orgId);
  },

  getCredentials: getStoredCredentials,

  clearCredentials: () => {
    localStorage.removeItem('solidtime_api_key');
    localStorage.removeItem('solidtime_org_id');
  },
};

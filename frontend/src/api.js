const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.port === '3000'
    ? 'http://localhost:5000/api'
    : '/api');

export function getStoredToken() {
  return localStorage.getItem('cmms_token');
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem('cmms_token', token);
  } else {
    localStorage.removeItem('cmms_token');
  }
}

export function getStoredUser() {
  const u = localStorage.getItem('cmms_user');
  try {
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('cmms_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('cmms_user');
  }
}

async function request(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (res.status === 401 && !path.startsWith('/auth/login')) {
    setStoredToken(null);
    setStoredUser(null);
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const errorMsg = data?.message || data || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  async login(username, password, expectedRole = null) {
    const endpointMap = {
      Employee: '/auth/login/employee',
      ITAdmin: '/auth/login/itadmin',
      Developer: '/auth/login/developer',
    };
    const endpoint = (expectedRole && endpointMap[expectedRole]) || '/auth/login';
    const data = await request(endpoint, {
      method: 'POST',
      body: JSON.stringify({ username, password, expectedRole }),
    });
    setStoredToken(data.token);
    setStoredUser({
      userId: data.userId,
      username: data.username,
      fullName: data.fullName,
      role: data.role,
      email: data.email,
    });
    return data;
  },

  async getMe() {
    return request('/auth/me');
  },

  logout() {
    setStoredToken(null);
    setStoredUser(null);
  },

  // Dashboard
  async getDashboard() {
    return request('/dashboard');
  },

  // Devices
  async getDevices(params = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.groupId) query.append('groupId', params.groupId);
    if (params.status) query.append('status', params.status);
    if (params.isActive !== undefined) query.append('isActive', params.isActive);
    return request(`/devices?${query.toString()}`);
  },

  async getDevice(id) {
    return request(`/devices/${id}`);
  },

  async createDevice(device) {
    return request('/devices', {
      method: 'POST',
      body: JSON.stringify(device),
    });
  },

  async updateDevice(id, device) {
    return request(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(device),
    });
  },

  async deactivateDevice(id) {
    return request(`/devices/${id}`, {
      method: 'DELETE',
    });
  },

  async deleteDevice(id) {
    return request(`/devices/${id}`, {
      method: 'DELETE',
    });
  },

  // Groups
  async getGroups(isActive) {
    const query = isActive !== undefined ? `?isActive=${isActive}` : '';
    return request(`/groups${query}`);
  },

  async createGroup(group) {
    return request('/groups', {
      method: 'POST',
      body: JSON.stringify(group),
    });
  },

  async updateGroup(id, group) {
    return request(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(group),
    });
  },

  async deactivateGroup(id) {
    return request(`/groups/${id}`, {
      method: 'DELETE',
    });
  },

  async deleteGroup(id) {
    return request(`/groups/${id}`, {
      method: 'DELETE',
    });
  },

  // Sessions
  async startSession(notes = '') {
    return request('/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  async getActiveSession() {
    try {
      return await request('/sessions/active');
    } catch {
      return null;
    }
  },

  async getSession(id) {
    return request(`/sessions/${id}`);
  },

  async recordCheck(sessionId, deviceId, deviceStatus, notes = '') {
    return request(`/sessions/${sessionId}/check`, {
      method: 'POST',
      body: JSON.stringify({ deviceId, deviceStatus, notes }),
    });
  },

  async recordBatchCheck(sessionId, checks) {
    return request(`/sessions/${sessionId}/batch-check`, {
      method: 'POST',
      body: JSON.stringify({ checks }),
    });
  },

  async completeSession(sessionId, notes = '') {
    return request(`/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  async cancelSession(sessionId) {
    return request(`/sessions/${sessionId}/cancel`, {
      method: 'POST',
    });
  },

  async getRecentSessions(limit = 10) {
    return request(`/sessions/recent?limit=${limit}`);
  },

  async updateSession(id, data) {
    return request(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteSession(id) {
    return request(`/sessions/${id}`, {
      method: 'DELETE',
    });
  },

  // Incidents
  async getIncidents(status = '') {
    const query = status ? `?status=${status}` : '';
    return request(`/incidents${query}`);
  },

  async createIncident(data) {
    return request('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateIncident(id, data) {
    return request(`/incidents/${id}/action`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteIncident(id) {
    return request(`/incidents/${id}`, {
      method: 'DELETE',
    });
  },

  // History
  async getHistory(filters = {}) {
    const query = new URLSearchParams();
    if (filters.sessionId) query.append('sessionId', filters.sessionId);
    if (filters.groupId) query.append('groupId', filters.groupId);
    if (filters.deviceId) query.append('deviceId', filters.deviceId);
    if (filters.mobileCode) query.append('mobileCode', filters.mobileCode);
    if (filters.status) query.append('status', filters.status);
    if (filters.date) query.append('date', filters.date);
    return request(`/history?${query.toString()}`);
  },

  async updateHistoryRecord(id, data) {
    return request(`/history/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteHistoryRecord(id) {
    return request(`/history/${id}`, {
      method: 'DELETE',
    });
  },

  // Reports
  async getReportByDate(date) {
    const query = date ? `?date=${encodeURIComponent(date)}` : '';
    return request(`/reports/by-date${query}`);
  },

  async getDailyReports(days = 7) {
    return request(`/reports/daily?days=${days}`);
  },

  async getGroupAvailabilityReports() {
    return request('/reports/group-availability');
  },

  async getAdminActivityReports() {
    return request('/reports/admin-activity');
  },

  // Users (Developer only)
  async getUsers() {
    return request('/users');
  },

  async createUser(user) {
    return request('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  async updateUser(id, user) {
    return request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  },

  async deleteUser(id) {
    return request(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Settings
  async getSettings() {
    return request('/settings');
  },

  async createSetting(data) {
    return request('/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSetting(key, settingValue, description = null) {
    return request(`/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ settingKey: key, settingValue, description }),
    });
  },

  async deleteSetting(key) {
    return request(`/settings/${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
  },

  // Notifications
  async getNotifications(unreadOnly = false) {
    const query = unreadOnly ? '?unreadOnly=true' : '';
    return request(`/notifications${query}`);
  },

  async createNotification(data) {
    return request('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateNotification(id, data) {
    return request(`/notifications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteNotification(id) {
    return request(`/notifications/${id}`, {
      method: 'DELETE',
    });
  },

  async markNotificationRead(id) {
    return request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  async markAllNotificationsRead() {
    return request('/notifications/read-all', {
      method: 'PUT',
    });
  },

  // Role Permissions (Developer User Permission Dashboard)
  async getPermissions() {
    return request('/permissions');
  },

  async createPermission(data) {
    return request('/permissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updatePermission(functionKey, data) {
    return request(`/permissions/${encodeURIComponent(functionKey)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deletePermission(functionKey) {
    return request(`/permissions/${encodeURIComponent(functionKey)}`, {
      method: 'DELETE',
    });
  },

  async togglePermission(functionKey, role, isEnabled, extra = {}) {
    return request('/permissions/toggle', {
      method: 'PUT',
      body: JSON.stringify({ functionKey, role, isEnabled, ...extra }),
    });
  },

  async resetPermissions() {
    return request('/permissions/reset', {
      method: 'POST',
    });
  },
};

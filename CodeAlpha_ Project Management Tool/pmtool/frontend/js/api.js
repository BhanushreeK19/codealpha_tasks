/* =============================================================================
   api.js — thin fetch wrapper that attaches the JWT and normalizes errors.
   Change API_BASE_URL if your backend runs on a different host/port.
   ============================================================================= */

const API_BASE_URL = 'http://localhost:8080/api';

const TokenStore = {
  getAccess() { return localStorage.getItem('pmtool_access_token'); },
  getRefresh() { return localStorage.getItem('pmtool_refresh_token'); },
  getUser() {
    const raw = localStorage.getItem('pmtool_user');
    return raw ? JSON.parse(raw) : null;
  },
  save(jwtResponse) {
    localStorage.setItem('pmtool_access_token', jwtResponse.accessToken);
    localStorage.setItem('pmtool_refresh_token', jwtResponse.refreshToken);
    localStorage.setItem('pmtool_user', JSON.stringify(jwtResponse.user));
  },
  clear() {
    localStorage.removeItem('pmtool_access_token');
    localStorage.removeItem('pmtool_refresh_token');
    localStorage.removeItem('pmtool_user');
  }
};

class ApiError extends Error {
  constructor(message, status, fieldErrors) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function apiRequest(path, { method = 'GET', body, auth = true, retry = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = TokenStore.getAccess();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (networkErr) {
    throw new ApiError('Could not reach the server. Is the backend running?', 0);
  }

  // Access token expired — try a silent refresh once, then replay the request.
  if (response.status === 401 && auth && retry && TokenStore.getRefresh()) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiRequest(path, { method, body, auth, retry: false });
    }
    TokenStore.clear();
    window.location.href = 'index.html';
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  if (response.status === 204) return null;

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, data?.fieldErrors);
  }
  return data;
}

async function tryRefreshToken() {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: TokenStore.getRefresh() })
    });
    if (!res.ok) return false;
    const data = await res.json();
    TokenStore.save(data);
    return true;
  } catch {
    return false;
  }
}

const Api = {
  // ---- auth ----
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload, auth: false }),

  // ---- users ----
  me: () => apiRequest('/users/me'),
  searchUsers: (q) => apiRequest(`/users/search?q=${encodeURIComponent(q)}`),

  // ---- dashboard ----
  dashboard: () => apiRequest('/dashboard'),

  // ---- projects ----
  listProjects: () => apiRequest('/projects'),
  getProject: (id) => apiRequest(`/projects/${id}`),
  createProject: (payload) => apiRequest('/projects', { method: 'POST', body: payload }),
  updateProject: (id, payload) => apiRequest(`/projects/${id}`, { method: 'PUT', body: payload }),
  deleteProject: (id) => apiRequest(`/projects/${id}`, { method: 'DELETE' }),
  listMembers: (projectId) => apiRequest(`/projects/${projectId}/members`),
  inviteMember: (projectId, payload) => apiRequest(`/projects/${projectId}/members`, { method: 'POST', body: payload }),
  removeMember: (projectId, userId) => apiRequest(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
  projectActivity: (projectId) => apiRequest(`/projects/${projectId}/activity`),

  // ---- boards ----
  listBoards: (projectId) => apiRequest(`/projects/${projectId}/boards`),
  createBoard: (projectId, payload) => apiRequest(`/projects/${projectId}/boards`, { method: 'POST', body: payload }),
  deleteBoard: (boardId) => apiRequest(`/boards/${boardId}`, { method: 'DELETE' }),

  // ---- tasks ----
  createTask: (payload) => apiRequest('/tasks', { method: 'POST', body: payload }),
  getTask: (id) => apiRequest(`/tasks/${id}`),
  updateTask: (id, payload) => apiRequest(`/tasks/${id}`, { method: 'PUT', body: payload }),
  moveTask: (id, payload) => apiRequest(`/tasks/${id}/move`, { method: 'PATCH', body: payload }),
  deleteTask: (id) => apiRequest(`/tasks/${id}`, { method: 'DELETE' }),
  assignedToMe: () => apiRequest('/tasks/assigned-to-me'),

  // ---- comments ----
  listComments: (taskId) => apiRequest(`/tasks/${taskId}/comments`),
  addComment: (taskId, payload) => apiRequest(`/tasks/${taskId}/comments`, { method: 'POST', body: payload }),
  deleteComment: (commentId) => apiRequest(`/comments/${commentId}`, { method: 'DELETE' }),

  // ---- notifications ----
  listNotifications: () => apiRequest('/notifications'),
  unreadCount: () => apiRequest('/notifications/unread-count'),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => apiRequest('/notifications/read-all', { method: 'PATCH' })
};

/* ============================================
   api.js — Central API Layer
   ============================================
   All fetch calls to the Express backend go
   through the `api()` function here.
   Token is read from localStorage automatically.
   ============================================ */

// ── Core fetch wrapper ───────────────────────
async function api(path, method = 'GET', body = null) {
  const token = localStorage.getItem('sb_token');

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  };

   // 🌍 Backend Base URL (Render Deployment)
const API_URL = "https://to-do-list-2t2u.onrender.com";
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${path}`, options);
  const data = await res.json();

  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

// ══════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════

const Auth = {
  register: (name, email, password) =>
    api('/auth/register', 'POST', { name, email, password }),

  login: (email, password) =>
    api('/auth/login', 'POST', { email, password }),

  me: () => api('/auth/me'),
};

// ══════════════════════════════════════════════
// TASKS
// ══════════════════════════════════════════════

const Tasks = {
  // Get all tasks, optional filters object: { status, priority, subject, tag, search }
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    const query = params.toString() ? `?${params}` : '';
    return api(`/tasks${query}`);
  },

  getOne: (id) => api(`/tasks/${id}`),

  getDashboard: () => api('/tasks/dashboard'),

  create: (data) => api('/tasks', 'POST', data),

  update: (id, data) => api(`/tasks/${id}`, 'PUT', data),

  delete: (id) => api(`/tasks/${id}`, 'DELETE'),

  toggleComplete: (id) => api(`/tasks/${id}/complete`, 'PATCH'),
};

// ══════════════════════════════════════════════
// EXAMS
// ══════════════════════════════════════════════

const Exams = {
  getAll: () => api('/exams'),
  create: (data) => api('/exams', 'POST', data),
  update: (id, data) => api(`/exams/${id}`, 'PUT', data),
  delete: (id) => api(`/exams/${id}`, 'DELETE'),
};

// ══════════════════════════════════════════════
// SUBJECTS
// ══════════════════════════════════════════════

const SubjectsAPI = {
  getAll: () => api('/subjects'),
  create: (data) => api('/subjects', 'POST', data),
  update: (id, data) => api(`/subjects/${id}`, 'PUT', data),
  delete: (id) => api(`/subjects/${id}`, 'DELETE'),
};

// ══════════════════════════════════════════════
// USERS / PROFILE
// ══════════════════════════════════════════════

const Users = {
  getProfile: () => api('/users/profile'),

  updateProfile: (data) => api('/users/profile', 'PUT', data),

  logStudyTime: (minutes) => api('/users/study-log', 'POST', { minutes }),
};

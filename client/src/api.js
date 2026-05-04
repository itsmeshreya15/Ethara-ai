const base = import.meta.env.VITE_API_URL || "";

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(t) {
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { ...options, headers });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || "Invalid response" };
  }
  if (!res.ok) {
    const raw = data?.error;
    let message = res.statusText;
    if (typeof raw === "string") message = raw;
    else if (raw?.message) message = String(raw.message);
    else if (raw) message = JSON.stringify(raw);
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  register: (body) => request("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/api/auth/me"),
  dashboard: () => request("/api/dashboard"),
  projects: () => request("/api/projects"),
  createProject: (body) => request("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  project: (id) => request(`/api/projects/${id}`),
  updateProject: (id, body) =>
    request(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteProject: (id) => request(`/api/projects/${id}`, { method: "DELETE" }),
  inviteMember: (projectId, body) =>
    request(`/api/projects/${projectId}/members`, { method: "POST", body: JSON.stringify(body) }),
  updateMemberRole: (projectId, userId, body) =>
    request(`/api/projects/${projectId}/members/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  removeMember: (projectId, userId) =>
    request(`/api/projects/${projectId}/members/${userId}`, { method: "DELETE" }),
  tasks: (projectId) => request(`/api/projects/${projectId}/tasks`),
  createTask: (projectId, body) =>
    request(`/api/projects/${projectId}/tasks`, { method: "POST", body: JSON.stringify(body) }),
  updateTask: (projectId, taskId, body) =>
    request(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteTask: (projectId, taskId) =>
    request(`/api/projects/${projectId}/tasks/${taskId}`, { method: "DELETE" }),
};

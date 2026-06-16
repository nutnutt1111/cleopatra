let sessionUser = null;

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export async function isLoggedIn() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) {
      sessionUser = null;
      return false;
    }
    const data = await res.json();
    sessionUser = data.user;
    return true;
  } catch {
    sessionUser = null;
    return false;
  }
}

export function getSessionUser() {
  return sessionUser;
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = getCsrfToken();
    if (csrf) headers.set('X-CSRF-Token', csrf);
  }
  return fetch(path, { ...options, headers, credentials: 'include' });
}

export async function login(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
  sessionUser = data.user;
  return data.user;
}

export async function logout() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } finally {
    sessionUser = null;
  }
}

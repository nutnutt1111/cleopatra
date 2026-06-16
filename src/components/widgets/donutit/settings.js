import { login, logout, isLoggedIn, apiFetch } from './donutit-api.js';
import { bindOnce } from './bind-once.js';

async function refreshStatus() {
  const el = document.getElementById('login-status');
  if (!el) return;
  if (!(await isLoggedIn())) {
    el.textContent = 'ยังไม่ได้เข้าสู่ระบบ';
    return;
  }
  try {
    const res = await apiFetch('/api/auth/me');
    const data = await res.json();
    el.textContent = `เข้าสู่ระบบ: ${data.user.name} (${data.user.role})`;
  } catch {
    el.textContent = 'เซสชันหมดอายุ';
  }
}

export async function initSettings() {
  if (!document.querySelector('[data-donutit-module="settings"]')) return;

  bindOnce(document.getElementById('btn-login'), 'click', async () => {
    try {
      const user = await login(
        document.getElementById('login-email').value,
        document.getElementById('login-password').value,
      );
      document.getElementById('login-status').textContent = `สำเร็จ: ${user.name} (${user.role})`;
    } catch (e) {
      document.getElementById('login-status').textContent = e.message;
    }
  });

  bindOnce(document.getElementById('btn-logout'), 'click', async () => {
    await logout();
    refreshStatus();
  });

  refreshStatus();
}

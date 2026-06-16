import { login, logout, isLoggedIn, apiFetch } from './donutit-api.js';
import { bindOnce } from './bind-once.js';
import { notify } from './notify.js';
import { navigate } from '../../layout/router.js';
import { refreshNavbarSession } from '../navbar/navbar.js';

function safeNext(raw) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw === '/') return '/dashboard';
  if (raw === '/login' || raw === '/settings') return '/dashboard';
  return raw;
}

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
        document.getElementById('login-email').value.trim(),
        document.getElementById('login-password').value,
      );
      notify(`ยินดีต้อนรับ ${user.name}`, 'success');
      await refreshNavbarSession();
      const next = safeNext(new URLSearchParams(location.search).get('next'));
      await navigate(next);
    } catch (e) {
      notify(e.message, 'error');
      document.getElementById('login-status').textContent = e.message;
    }
  });

  bindOnce(document.getElementById('btn-logout'), 'click', async () => {
    await logout();
    await refreshNavbarSession();
    refreshStatus();
    notify('ออกจากระบบแล้ว', 'info');
  });

  refreshStatus();
}

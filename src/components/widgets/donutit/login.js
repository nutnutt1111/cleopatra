import { login } from './donutit-api.js';
import { bindOnce } from './bind-once.js';
import { notify } from './notify.js';
import { refreshNavbarSession } from '../navbar/navbar.js';

function safeNext(raw) {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw === '/') return '/dashboard';
  if (raw === '/login') return '/dashboard';
  return raw;
}

export async function initLogin() {
  if (!document.querySelector('[data-donutit-module="login"]')) return;

  const form = document.getElementById('login-form');
  const statusEl = document.getElementById('login-status');

  bindOnce(form, 'submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'กำลังเข้าสู่ระบบ…';
    }
    if (statusEl) statusEl.textContent = '';

    try {
      const user = await login(
        document.getElementById('login-email').value.trim(),
        document.getElementById('login-password').value,
      );
      notify(`ยินดีต้อนรับ ${user.name}`, 'success');
      await refreshNavbarSession();
      const next = safeNext(new URLSearchParams(location.search).get('next'));
      location.assign(next);
    } catch (err) {
      notify(err.message, 'error');
      if (statusEl) statusEl.textContent = err.message;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'เข้าสู่ระบบ';
      }
    }
  });
}

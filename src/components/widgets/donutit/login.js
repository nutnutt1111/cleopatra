import { login, logout, isLoggedIn, getSessionUser } from './donutit-api.js';
import { bindOnce } from './bind-once.js';
import { notify } from './notify.js';
import { refreshNavbarSession } from '../navbar/navbar.js';
import { appPath, safeNextAfterLogin, stripAppBase } from '../../../js/donutit-paths.js';

async function showLoggedInState() {
  const formWrap = document.getElementById('login-form-wrap');
  const already = document.getElementById('login-already');
  const nameEl = document.getElementById('login-user-name');

  if (!(await isLoggedIn())) {
    if (formWrap) formWrap.classList.remove('hidden');
    if (already) already.classList.add('hidden');
    return;
  }

  const user = getSessionUser();
  if (nameEl && user) nameEl.textContent = `${user.name} (${user.email})`;
  if (formWrap) formWrap.classList.add('hidden');
  if (already) already.classList.remove('hidden');
}

export async function initLogin() {
  if (!document.querySelector('[data-donutit-module="login"]')) return;

  // Drop stale ?next=/settings from older redirects
  const params = new URLSearchParams(location.search);
  const next = params.get('next');
  if (next && stripAppBase(next) === '/settings') {
    history.replaceState({}, '', appPath('/login'));
  }

  await showLoggedInState();

  bindOnce(document.getElementById('btn-go-dashboard'), 'click', () => {
    location.assign(appPath('/dashboard'));
  });

  bindOnce(document.getElementById('btn-switch-account'), 'click', async () => {
    await logout();
    await refreshNavbarSession();
    notify('ออกจากระบบแล้ว — เข้าบัญชีอื่นได้', 'info');
    location.assign(appPath('/login'));
  });

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
      const next = safeNextAfterLogin(new URLSearchParams(location.search).get('next'));
      location.assign(appPath(next));
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

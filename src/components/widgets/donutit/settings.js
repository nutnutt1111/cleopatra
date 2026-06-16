import { logout, isLoggedIn, apiFetch } from './donutit-api.js';
import { bindOnce } from './bind-once.js';
import { notify } from './notify.js';
import { appPath } from '../../../js/donutit-paths.js';
import { refreshNavbarSession } from '../navbar/navbar.js';

const ROLE_LABELS = {
  OWNER: 'เจ้าของร้าน',
  MANAGER: 'ผู้จัดการ',
  STAFF: 'พนักงาน',
  HR: 'HR',
};

async function refreshAccount() {
  const statusEl = document.getElementById('settings-status');
  const nameEl = document.getElementById('settings-user-name');
  const emailEl = document.getElementById('settings-user-email');
  const roleEl = document.getElementById('settings-user-role');
  const avatarEl = document.getElementById('settings-avatar');

  if (!(await isLoggedIn())) {
    if (statusEl) statusEl.textContent = 'ยังไม่ได้เข้าสู่ระบบ';
    return;
  }

  try {
    const res = await apiFetch('/api/auth/me');
    const data = await res.json();
    const user = data.user;

    if (nameEl) nameEl.textContent = user.name;
    if (emailEl) emailEl.textContent = user.email;
    if (roleEl) roleEl.textContent = ROLE_LABELS[user.role] ?? user.role;
    if (avatarEl) avatarEl.textContent = user.name.slice(0, 1).toUpperCase();
    if (statusEl) statusEl.textContent = 'เซสชันใช้งานได้ปกติ';
  } catch {
    if (statusEl) statusEl.textContent = 'เซสชันหมดอายุ — กรุณาเข้าสู่ระบบใหม่';
  }
}

export async function initSettings() {
  if (!document.querySelector('[data-donutit-module="settings"]')) return;

  bindOnce(document.getElementById('btn-logout'), 'click', async () => {
    await logout();
    await refreshNavbarSession();
    notify('ออกจากระบบแล้ว', 'info');
    location.assign(appPath('/login'));
  });

  await refreshAccount();
}

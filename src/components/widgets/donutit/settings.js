import { apiFetch } from './donutit-api.js';
import { refreshNavbarSession } from '../navbar/navbar.js';

const ROLE_LABELS = {
  OWNER: 'เจ้าของร้าน',
  MANAGER: 'ผู้จัดการ',
  STAFF: 'พนักงาน',
  HR: 'HR',
};

export async function initSettings() {
  if (!document.querySelector('[data-donutit-module="settings"]')) return;

  const statusEl = document.getElementById('settings-status');
  const nameEl = document.getElementById('settings-user-name');
  const emailEl = document.getElementById('settings-user-email');
  const roleEl = document.getElementById('settings-user-role');
  const avatarEl = document.getElementById('settings-avatar');

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
    if (statusEl) statusEl.textContent = 'เซสชันหมดอายุ';
  }

  await refreshNavbarSession();
}

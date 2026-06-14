import { AUTH_CONFIG, isSupabaseConfigured } from './config.js';
import {
  getLoginUrlWithNext,
  hideAuthError,
  redirectTo,
} from './auth-flow.js';
import { getStoredPinDisplay } from './device.js';
import { getCurrentSession } from './supabase.js';
import { renderPinSlots } from '../../components/auth/pin-keypad.js';

function renderPinDisplay(showPlain = false) {
  const slotsContainer = document.getElementById('security-pin-slots');
  const pinStatusEl = document.getElementById('security-pin-status');
  const changePinBtn = document.getElementById('security-change-pin-btn');
  const togglePinBtn = document.getElementById('security-toggle-pin');

  if (!slotsContainer || !pinStatusEl) return;

  const pin = getStoredPinDisplay();
  const hasPin = Boolean(pin);

  if (!hasPin) {
    slotsContainer.innerHTML = '';
    for (let i = 0; i < 6; i += 1) {
      const slot = document.createElement('span');
      slot.className = 'inline-flex items-center justify-center w-10 h-12 sm:w-11 sm:h-14 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm';
      slot.textContent = '–';
      slotsContainer.appendChild(slot);
    }
    pinStatusEl.textContent = 'ยังไม่ได้ตั้ง PIN 6 หลัก';
    if (changePinBtn) changePinBtn.textContent = 'ตั้ง PIN 6 หลัก';
    if (togglePinBtn) togglePinBtn.classList.add('hidden');
    return;
  }

  renderPinSlots(slotsContainer, pin, { masked: !showPlain });
  pinStatusEl.textContent = 'PIN 6 หลัก (ใช้ปลดล็อกอุปกรณ์นี้)';
  if (changePinBtn) changePinBtn.textContent = 'เปลี่ยน PIN';
  if (togglePinBtn) {
    togglePinBtn.classList.remove('hidden');
    togglePinBtn.textContent = showPlain ? 'ซ่อน PIN' : 'แสดง PIN';
  }
}

export function initSecuritySettings() {
  if (!document.getElementById('security-settings-page')) return;
  bootstrapSecuritySettings();
}

async function bootstrapSecuritySettings() {
  if (!isSupabaseConfigured()) return;

  const session = await getCurrentSession();
  if (!session?.user) {
    redirectTo(getLoginUrlWithNext(AUTH_CONFIG.routes.settings.security));
    return;
  }

  const changePinBtn = document.getElementById('security-change-pin-btn');
  const togglePinBtn = document.getElementById('security-toggle-pin');
  let pinVisible = false;

  renderPinDisplay(pinVisible);

  togglePinBtn?.addEventListener('click', () => {
    if (!getStoredPinDisplay()) return;
    pinVisible = !pinVisible;
    renderPinDisplay(pinVisible);
  });

  changePinBtn?.addEventListener('click', () => {
    redirectTo(`${AUTH_CONFIG.routes.setPin}?from=settings`);
  });
}

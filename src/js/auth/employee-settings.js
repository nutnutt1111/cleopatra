import { AUTH_CONFIG, isSupabaseConfigured } from './config.js';
import {
  hideAuthError,
  redirectTo,
  setLoading,
  showAuthError,
} from './auth-flow.js';
import { getStoredPinDisplay } from './device.js';
import { getCurrentSession } from './supabase.js';
import {
  getDefaultEmployeeName,
  getEmployeeProfile,
  upsertEmployeeProfile,
} from './profile-service.js';

function showSuccess(container, message) {
  if (!container) return;
  container.textContent = message;
  container.classList.remove('hidden');
}

function hideSuccess(container) {
  if (!container) return;
  container.textContent = '';
  container.classList.add('hidden');
}

function renderPinDisplay() {
  const pinValueEl = document.getElementById('employee-pin-value');
  const pinStatusEl = document.getElementById('employee-pin-status');
  const changePinBtn = document.getElementById('change-pin-btn');
  const togglePinBtn = document.getElementById('toggle-pin-visibility');

  if (!pinValueEl || !pinStatusEl) return;

  const pin = getStoredPinDisplay();
  const hasPin = Boolean(pin);

  if (!hasPin) {
    pinValueEl.textContent = '—';
    pinStatusEl.textContent = 'ยังไม่ได้ตั้ง PIN 6 หลัก';
    pinStatusEl.className = 'text-sm text-muted-foreground';
    if (changePinBtn) changePinBtn.textContent = 'ตั้ง PIN 6 หลัก';
    if (togglePinBtn) togglePinBtn.classList.add('hidden');
    return;
  }

  pinValueEl.dataset.pin = pin;
  pinValueEl.textContent = '••••••';
  pinStatusEl.textContent = 'PIN 6 หลัก (ใช้ปลดล็อกอุปกรณ์นี้)';
  pinStatusEl.className = 'text-sm text-muted-foreground';
  if (changePinBtn) changePinBtn.textContent = 'เปลี่ยน PIN';
  if (togglePinBtn) togglePinBtn.classList.remove('hidden');
}

export function initEmployeeSettings() {
  const page = document.getElementById('employee-settings-page');
  if (!page) return;

  bootstrapEmployeeSettings();
}

async function bootstrapEmployeeSettings() {
  const errorBox = document.getElementById('employee-settings-error');
  const successBox = document.getElementById('employee-settings-success');
  const nameInput = document.getElementById('employee-name');
  const emailInput = document.getElementById('employee-email');
  const saveBtn = document.getElementById('save-employee-btn');
  const changePinBtn = document.getElementById('change-pin-btn');
  const togglePinBtn = document.getElementById('toggle-pin-visibility');
  const pinValueEl = document.getElementById('employee-pin-value');

  if (!isSupabaseConfigured()) {
    showAuthError(errorBox, 'ยังไม่ได้ตั้งค่า Supabase กรุณาตรวจสอบไฟล์ .env');
    return;
  }

  const session = await getCurrentSession();
  if (!session?.user) {
    redirectTo(AUTH_CONFIG.routes.login);
    return;
  }

  const { user } = session;

  if (emailInput) {
    emailInput.value = user.email || '';
  }

  try {
    const profile = await getEmployeeProfile(user.id);
    if (nameInput) {
      nameInput.value = profile?.full_name || getDefaultEmployeeName(user);
    }
  } catch (error) {
    if (nameInput) {
      nameInput.value = getDefaultEmployeeName(user);
    }
    console.error('Failed to load employee profile:', error);
  }

  renderPinDisplay();

  let pinVisible = false;
  togglePinBtn?.addEventListener('click', () => {
    if (!pinValueEl?.dataset.pin) return;

    pinVisible = !pinVisible;
    pinValueEl.textContent = pinVisible ? pinValueEl.dataset.pin : '••••••';
    togglePinBtn.textContent = pinVisible ? 'ซ่อน PIN' : 'แสดง PIN';
  });

  changePinBtn?.addEventListener('click', () => {
    redirectTo(`${AUTH_CONFIG.routes.setPin}?from=settings`);
  });

  document.getElementById('employee-settings-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAuthError(errorBox);
    hideSuccess(successBox);

    const fullName = nameInput?.value.trim() || '';

    if (!fullName) {
      showAuthError(errorBox, 'กรุณากรอกชื่อพนักงาน');
      return;
    }

    setLoading(saveBtn, true, 'กำลังบันทึก...');

    try {
      await upsertEmployeeProfile(user.id, fullName);
      showSuccess(successBox, 'บันทึกข้อมูลพนักงานเรียบร้อยแล้ว');
    } catch (error) {
      showAuthError(errorBox, error?.message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setLoading(saveBtn, false);
    }
  });
}

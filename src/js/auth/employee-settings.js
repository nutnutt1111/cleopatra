import { AUTH_CONFIG, isSupabaseConfigured } from './config.js';
import {
  getLoginUrlWithNext,
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
import { renderPinSlots } from '../../components/auth/pin-keypad.js';

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

function renderPinDisplay(showPlain = false) {
  const slotsContainer = document.getElementById('employee-pin-slots');
  const pinStatusEl = document.getElementById('employee-pin-status');
  const changePinBtn = document.getElementById('change-pin-btn');
  const togglePinBtn = document.getElementById('toggle-pin-visibility');

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

  if (!isSupabaseConfigured()) {
    showAuthError(errorBox, 'ยังไม่ได้ตั้งค่า Supabase กรุณาตรวจสอบไฟล์ .env');
    return;
  }

  const session = await getCurrentSession();
  if (!session?.user) {
    redirectTo(getLoginUrlWithNext(AUTH_CONFIG.routes.employeeSettings));
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

import { AUTH_CONFIG, isSupabaseConfigured } from './config.js';
import {
  getLoginUrlWithNext,
  hideAuthError,
  redirectTo,
  setLoading,
  showAuthError,
} from './auth-flow.js';
import { getCurrentSession } from './supabase.js';
import {
  getDefaultEmployeeName,
  getEmployeeProfile,
  getRoleLabel,
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

export function initProfileSettings() {
  if (!document.getElementById('profile-settings-page')) return;
  bootstrapProfileSettings();
}

async function bootstrapProfileSettings() {
  const errorBox = document.getElementById('profile-settings-error');
  const successBox = document.getElementById('profile-settings-success');
  const nameInput = document.getElementById('profile-name');
  const emailInput = document.getElementById('profile-email');
  const roleInput = document.getElementById('profile-role');
  const saveBtn = document.getElementById('profile-save-btn');

  if (!isSupabaseConfigured()) {
    showAuthError(errorBox, 'ยังไม่ได้ตั้งค่า Supabase กรุณาตรวจสอบไฟล์ .env');
    return;
  }

  const session = await getCurrentSession();
  if (!session?.user) {
    redirectTo(getLoginUrlWithNext(AUTH_CONFIG.routes.settings.profile));
    return;
  }

  const { user } = session;

  if (emailInput) emailInput.value = user.email || '';

  let profile = null;
  try {
    profile = await getEmployeeProfile(user.id);
    if (nameInput) nameInput.value = profile?.full_name || getDefaultEmployeeName(user);
    if (roleInput) roleInput.value = getRoleLabel(profile?.role || 'staff');
  } catch (error) {
    if (nameInput) nameInput.value = getDefaultEmployeeName(user);
    if (roleInput) roleInput.value = getRoleLabel('staff');
    console.error('Failed to load profile:', error);
  }

  document.getElementById('profile-settings-form')?.addEventListener('submit', async (event) => {
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
      await upsertEmployeeProfile(user.id, {
        fullName,
        role: profile?.role || 'staff',
        status: profile?.status || 'active',
      });
      showSuccess(successBox, 'บันทึกโปรไฟล์เรียบร้อยแล้ว');
    } catch (error) {
      showAuthError(errorBox, error?.message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setLoading(saveBtn, false);
    }
  });
}

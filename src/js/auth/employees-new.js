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
  canManageEmployees,
  createEmployeeAccount,
  getEmployeeProfile,
  getRoleLabel,
  getStatusLabel,
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

export function initEmployeesNew() {
  if (!document.getElementById('employees-new-page')) return;
  bootstrapEmployeesNew();
}

async function bootstrapEmployeesNew() {
  const errorBox = document.getElementById('employees-new-error');
  const successBox = document.getElementById('employees-new-success');
  const form = document.getElementById('employees-new-form');
  const submitBtn = document.getElementById('employees-new-submit');

  if (!isSupabaseConfigured()) {
    showAuthError(errorBox, 'ยังไม่ได้ตั้งค่า Supabase กรุณาตรวจสอบไฟล์ .env');
    return;
  }

  const session = await getCurrentSession();
  if (!session?.user) {
    redirectTo(getLoginUrlWithNext(AUTH_CONFIG.routes.settings.employeesNew));
    return;
  }

  const profile = await getEmployeeProfile(session.user.id).catch(() => null);
  if (!canManageEmployees(session.user, profile)) {
    showAuthError(errorBox, 'คุณไม่มีสิทธิ์เพิ่มพนักงาน ต้องเป็น Admin หรือ Manager');
    form?.querySelectorAll('input, select, button').forEach((el) => { el.disabled = true; });
    return;
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAuthError(errorBox);
    hideSuccess(successBox);

    const fullName = document.getElementById('new-employee-name')?.value.trim() || '';
    const email = document.getElementById('new-employee-email')?.value.trim() || '';
    const password = document.getElementById('new-employee-password')?.value || '';
    const role = document.getElementById('new-employee-role')?.value || 'staff';
    const status = document.getElementById('new-employee-status')?.value || 'pending';

    if (!fullName || !email || !password) {
      showAuthError(errorBox, 'กรุณากรอกข้อมูลให้ครบ');
      return;
    }

    if (password.length < 6) {
      showAuthError(errorBox, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(submitBtn, true, 'กำลังสร้างบัญชี...');

    try {
      await createEmployeeAccount({ fullName, email, password, role, status });
      showSuccess(successBox, `สร้างบัญชี ${email} (${getRoleLabel(role)}, ${getStatusLabel(status)}) เรียบร้อยแล้ว`);
      form.reset();
    } catch (error) {
      showAuthError(errorBox, error?.message || 'ไม่สามารถสร้างพนักงานได้');
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

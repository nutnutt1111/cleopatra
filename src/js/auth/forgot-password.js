import '../../styles/tailwind.css';
import '../../styles/global.scss';
import { initAuthTheme, markAuthPageLoaded } from './theme-init.js';
import { AUTH_CONFIG, isSupabaseConfigured } from './config.js';
import {
  hideAuthError,
  setLoading,
  showAuthError,
} from './auth-flow.js';
import { isValidEmail } from './pin-crypto.js';
import { resetPassword } from './supabase.js';

function initThemeToggle() {
  const toggle = document.getElementById('auth-theme-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('cleopatra-mode', isDark ? 'dark' : 'light');
  });
}

async function bootstrapForgotPasswordPage() {
  initAuthTheme();
  initThemeToggle();
  markAuthPageLoaded();

  const form = document.getElementById('forgot-password-form');
  const errorBox = document.getElementById('forgot-error');
  const successBox = document.getElementById('forgot-success');
  const submitBtn = document.getElementById('forgot-submit');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAuthError(errorBox);
    successBox?.classList.add('hidden');

    const email = document.getElementById('forgot-email')?.value.trim() || '';

    if (!isValidEmail(email)) {
      showAuthError(errorBox, 'กรุณากรอกอีเมลให้ถูกต้อง');
      return;
    }

    if (!isSupabaseConfigured()) {
      showAuthError(errorBox, 'ยังไม่ได้ตั้งค่า Supabase กรุณาตรวจสอบไฟล์ .env');
      return;
    }

    setLoading(submitBtn, true, 'กำลังส่งลิงก์...');

    try {
      await resetPassword(email, `${window.location.origin}${AUTH_CONFIG.routes.login}`);
      successBox?.classList.remove('hidden');
      form.reset();
    } catch (error) {
      showAuthError(errorBox, error?.message || 'ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้');
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

document.addEventListener('DOMContentLoaded', bootstrapForgotPasswordPage);

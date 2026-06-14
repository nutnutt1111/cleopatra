import '../../styles/tailwind.css';
import '../../styles/global.scss';
import { initAuthTheme, markAuthPageLoaded } from './theme-init.js';
import { AUTH_CONFIG, isSupabaseConfigured } from './config.js';
import {
  afterEmailLogin,
  fallbackToEmailLogin,
  getQueryParam,
  hideAuthError,
  redirectTo,
  resolveInitialAuthRoute,
  setLoading,
  showAuthError,
} from './auth-flow.js';
import { shouldShowPinEntry } from './device.js';
import { isValidEmail, isValidPassword } from './pin-crypto.js';
import { signInWithEmail } from './supabase.js';

function initThemeToggle() {
  const toggle = document.getElementById('auth-theme-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('cleopatra-mode', isDark ? 'dark' : 'light');
  });
}

function showConfigWarning() {
  const warning = document.getElementById('config-warning');
  if (warning && !isSupabaseConfigured()) {
    warning.classList.remove('hidden');
  }
}

async function bootstrapLoginPage() {
  initAuthTheme();
  initThemeToggle();
  showConfigWarning();
  markAuthPageLoaded();

  const reason = getQueryParam('reason');
  const info = document.getElementById('login-info');
  if (reason === 'session_expired' && info) {
    info.textContent = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบด้วยอีเมลอีกครั้ง';
    info.classList.remove('hidden');
  }

  if (isSupabaseConfigured() && shouldShowPinEntry() && reason !== 'force_email') {
    redirectTo(AUTH_CONFIG.routes.enterPin);
    return;
  }

  const form = document.getElementById('email-login-form');
  const errorBox = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAuthError(errorBox);

    const email = document.getElementById('login-email')?.value.trim() || '';
    const password = document.getElementById('login-password')?.value || '';

    if (!isValidEmail(email)) {
      showAuthError(errorBox, 'กรุณากรอกอีเมลให้ถูกต้อง');
      return;
    }

    if (!isValidPassword(password)) {
      showAuthError(errorBox, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (!isSupabaseConfigured()) {
      showAuthError(errorBox, 'ยังไม่ได้ตั้งค่า Supabase กรุณาตรวจสอบไฟล์ .env');
      return;
    }

    setLoading(submitBtn, true, 'กำลังเข้าสู่ระบบ...');

    try {
      const { user } = await signInWithEmail(email, password);
      await afterEmailLogin(user);
    } catch (error) {
      const message = error?.message?.includes('Invalid login credentials')
        ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
        : (error?.message || 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่');
      showAuthError(errorBox, message);
    } finally {
      setLoading(submitBtn, false);
    }
  });

  document.getElementById('use-pin-link')?.addEventListener('click', (event) => {
    event.preventDefault();
    if (shouldShowPinEntry()) {
      redirectTo(AUTH_CONFIG.routes.enterPin);
    }
  });
}

document.addEventListener('DOMContentLoaded', bootstrapLoginPage);

import '../../styles/tailwind.css';
import '../../styles/global.scss';
import { initAuthTheme, markAuthPageLoaded } from './theme-init.js';
import { AUTH_CONFIG } from './config.js';
import {
  afterPinUnlock,
  fallbackToEmailLogin,
  hideAuthError,
  redirectTo,
  showAuthError,
} from './auth-flow.js';
import { getStoredPinUser, shouldShowPinEntry } from './device.js';
import { verifyDevicePin } from './pin-service.js';
import { createPinKeypad } from '../../components/auth/pin-keypad.js';

function initThemeToggle() {
  const toggle = document.getElementById('auth-theme-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('cleopatra-mode', isDark ? 'dark' : 'light');
  });
}

async function bootstrapEnterPinPage() {
  initAuthTheme();
  initThemeToggle();
  markAuthPageLoaded();

  const storedUser = getStoredPinUser();

  if (!shouldShowPinEntry() || !storedUser) {
    redirectTo(AUTH_CONFIG.routes.login);
    return;
  }

  const emailHint = document.getElementById('pin-user-email');
  if (emailHint && storedUser.email) {
    emailHint.textContent = storedUser.email;
  }

  const errorBox = document.getElementById('enter-pin-error');
  const dotsContainer = document.getElementById('enter-pin-dots');
  const keypadContainer = document.getElementById('enter-pin-keypad');
  let isVerifying = false;

  const keypad = createPinKeypad({
    container: keypadContainer,
    dotsContainer,
    onComplete: async (pin) => {
      if (isVerifying) return;
      isVerifying = true;
      hideAuthError(errorBox);

      try {
        const result = await verifyDevicePin(storedUser.userId, pin);

        if (result?.success) {
          await afterPinUnlock();
          return;
        }

        if (result?.error === 'max_attempts') {
          showAuthError(errorBox, 'ใส่ PIN ผิดเกิน 5 ครั้ง กรุณาเข้าสู่ระบบด้วยอีเมล');
          setTimeout(() => fallbackToEmailLogin(true), 1500);
          return;
        }

        if (result?.error === 'locked') {
          showAuthError(errorBox, 'ถูกล็อกชั่วคราว กรุณาเข้าสู่ระบบด้วยอีเมล');
          return;
        }

        const attempts = result?.failed_attempts || 0;
        const remaining = Math.max(0, (result?.max_attempts || 5) - attempts);
        showAuthError(errorBox, remaining > 0
          ? `PIN ไม่ถูกต้อง เหลืออีก ${remaining} ครั้ง`
          : 'PIN ไม่ถูกต้อง');
        keypad.shakeDots();
        keypad.clearPin();
      } catch (error) {
        showAuthError(errorBox, error?.message || 'ไม่สามารถตรวจสอบ PIN ได้');
        keypad.clearPin();
      } finally {
        isVerifying = false;
      }
    },
  });

  document.getElementById('use-email-link')?.addEventListener('click', (event) => {
    event.preventDefault();
    redirectTo(`${AUTH_CONFIG.routes.login}?reason=force_email`);
  });
}

document.addEventListener('DOMContentLoaded', bootstrapEnterPinPage);

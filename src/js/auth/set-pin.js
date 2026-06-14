import '../../styles/tailwind.css';
import '../../styles/global.scss';
import { initAuthTheme, markAuthPageLoaded } from './theme-init.js';
import { AUTH_CONFIG } from './config.js';
import {
  hideAuthError,
  getQueryParam,
  redirectTo,
  requireAuthenticatedSession,
  showAuthError,
} from './auth-flow.js';
import { markDevicePinRegistered } from './device.js';
import { isValidPin } from './pin-crypto.js';
import { saveDevicePin } from './pin-service.js';
import { createPinKeypad } from '../../components/auth/pin-keypad.js';

const STEPS = {
  ENTER: 'enter',
  CONFIRM: 'confirm',
};

function initThemeToggle() {
  const toggle = document.getElementById('auth-theme-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('cleopatra-mode', isDark ? 'dark' : 'light');
  });
}

async function bootstrapSetPinPage() {
  initAuthTheme();
  initThemeToggle();
  markAuthPageLoaded();

  const session = await requireAuthenticatedSession();
  if (!session) return;

  const title = document.getElementById('set-pin-title');
  const subtitle = document.getElementById('set-pin-subtitle');
  const errorBox = document.getElementById('set-pin-error');
  const dotsContainer = document.getElementById('set-pin-dots');
  const keypadContainer = document.getElementById('set-pin-keypad');

  let step = STEPS.ENTER;
  let firstPin = '';

  function updateCopy() {
    if (step === STEPS.ENTER) {
      title.textContent = 'ตั้ง PIN 6 หลัก';
      subtitle.textContent = 'ใช้สำหรับปลดล็อกอุปกรณ์นี้อย่างรวดเร็ว';
    } else {
      title.textContent = 'ยืนยัน PIN อีกครั้ง';
      subtitle.textContent = 'กรอก PIN ให้ตรงกับครั้งแรก';
    }
  }

  const keypad = createPinKeypad({
    container: keypadContainer,
    dotsContainer,
    onComplete: async (pin) => {
      hideAuthError(errorBox);

      if (step === STEPS.ENTER) {
        firstPin = pin;
        step = STEPS.CONFIRM;
        updateCopy();
        keypad.clearPin();
        return;
      }

      if (pin !== firstPin) {
        showAuthError(errorBox, 'PIN ไม่ตรงกัน กรุณาลองใหม่');
        keypad.shakeDots();
        step = STEPS.ENTER;
        firstPin = '';
        updateCopy();
        keypad.clearPin();
        return;
      }

      if (!isValidPin(pin)) {
        showAuthError(errorBox, 'PIN ต้องเป็นตัวเลข 6 หลักเท่านั้น');
        keypad.shakeDots();
        step = STEPS.ENTER;
        firstPin = '';
        updateCopy();
        keypad.clearPin();
        return;
      }

      try {
        const { pinSalt } = await saveDevicePin(session.user.id, pin);
        markDevicePinRegistered(session.user.id, session.user.email, pinSalt, pin);

        const fromSettings = getQueryParam('from') === 'settings';
        redirectTo(fromSettings ? AUTH_CONFIG.routes.employeeSettings : AUTH_CONFIG.redirectAfterLogin);
      } catch (error) {
        showAuthError(errorBox, error?.message || 'ไม่สามารถบันทึก PIN ได้');
        step = STEPS.ENTER;
        firstPin = '';
        updateCopy();
        keypad.clearPin();
      }
    },
  });

  updateCopy();

  document.getElementById('skip-pin-link')?.addEventListener('click', (event) => {
    event.preventDefault();
    redirectTo(AUTH_CONFIG.redirectAfterLogin);
  });
}

document.addEventListener('DOMContentLoaded', bootstrapSetPinPage);

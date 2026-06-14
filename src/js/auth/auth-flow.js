import { AUTH_CONFIG, isSupabaseConfigured } from './config.js';
import { getCurrentSession } from './supabase.js';
import {
  clearDevicePinRegistration,
  getStoredPinUser,
  isPinUnlocked,
  markDevicePinRegistered,
  setPinUnlocked,
  shouldShowPinEntry,
} from './device.js';
import { devicePinExists } from './pin-service.js';

export function redirectTo(path) {
  window.location.href = path;
}

export async function resolveInitialAuthRoute() {
  if (!isSupabaseConfigured()) {
    return AUTH_CONFIG.routes.login;
  }

  const storedPinUser = getStoredPinUser();

  if (storedPinUser && shouldShowPinEntry()) {
    if (isPinUnlocked()) {
      const session = await getCurrentSession();
      if (session) {
        return AUTH_CONFIG.redirectAfterLogin;
      }
    }

    return AUTH_CONFIG.routes.enterPin;
  }

  return AUTH_CONFIG.routes.login;
}

export async function afterEmailLogin(user) {
  const hasPin = await devicePinExists(user.id);
  const next = getQueryParam('next');

  if (hasPin) {
    markDevicePinRegistered(user.id, user.email, null);
    setPinUnlocked(true);
    redirectTo(getPostLoginRedirect());
    return;
  }

  const setPinUrl = next
    ? `${AUTH_CONFIG.routes.setPin}?next=${encodeURIComponent(next)}`
    : AUTH_CONFIG.routes.setPin;

  redirectTo(setPinUrl);
}

export async function afterPinUnlock() {
  const session = await getCurrentSession();

  setPinUnlocked(true);

  if (session) {
    redirectTo(getPostLoginRedirect());
    return;
  }

  redirectTo(`${AUTH_CONFIG.routes.login}?reason=session_expired`);
}

export function fallbackToEmailLogin(clearPin = false) {
  if (clearPin) {
    clearDevicePinRegistration();
  }

  redirectTo(AUTH_CONFIG.routes.login);
}

export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function getPostLoginRedirect() {
  const next = getQueryParam('next');

  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }

  return AUTH_CONFIG.redirectAfterLogin || AUTH_CONFIG.routes.dashboard;
}

export function getLoginUrlWithNext(nextPath) {
  if (!nextPath) {
    return AUTH_CONFIG.routes.login;
  }

  return `${AUTH_CONFIG.routes.login}?next=${encodeURIComponent(nextPath)}`;
}

export function showAuthError(container, message) {
  if (!container) return;

  container.textContent = message;
  container.classList.remove('hidden');
}

export function hideAuthError(container) {
  if (!container) return;

  container.textContent = '';
  container.classList.add('hidden');
}

export function setLoading(button, isLoading, loadingText = 'กำลังโหลด...') {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
    button.classList.add('opacity-70', 'cursor-not-allowed');
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || button.textContent;
    button.classList.remove('opacity-70', 'cursor-not-allowed');
  }
}

export async function requireAuthenticatedSession() {
  const session = await getCurrentSession();
  if (!session) {
    redirectTo(AUTH_CONFIG.routes.login);
    return null;
  }
  return session;
}

import { AUTH_CONFIG } from './config.js';
import { clearDevicePinRegistration, isPinUnlocked, setPinUnlocked } from './device.js';
import { signOut } from './supabase.js';
import { redirectTo } from './auth-flow.js';

export async function logout() {
  setPinUnlocked(false);

  try {
    await signOut();
  } catch (error) {
    console.error('Logout error:', error);
  }

  clearDevicePinRegistration();
  redirectTo(AUTH_CONFIG.routes.login);
}

export function initLogoutButtons() {
  document.querySelectorAll('[data-auth-logout]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      await logout();
    });
  });
}

export function isAuthenticatedAndUnlocked() {
  return isPinUnlocked();
}

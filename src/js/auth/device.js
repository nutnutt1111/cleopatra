import { AUTH_CONFIG } from './config.js';

function createDeviceId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function getDeviceId() {
  const key = AUTH_CONFIG.storageKeys.deviceId;
  let deviceId = localStorage.getItem(key);

  if (!deviceId) {
    deviceId = createDeviceId();
    localStorage.setItem(key, deviceId);
  }

  return deviceId;
}

export function getStoredPinUser() {
  const userId = localStorage.getItem(AUTH_CONFIG.storageKeys.pinUserId);
  const email = localStorage.getItem(AUTH_CONFIG.storageKeys.pinUserEmail);
  const enabled = localStorage.getItem(AUTH_CONFIG.storageKeys.pinEnabled) === 'true';

  if (!enabled || !userId) {
    return null;
  }

  return { userId, email: email || '' };
}

export function storePinSalt(salt) {
  localStorage.setItem(AUTH_CONFIG.storageKeys.pinSalt, salt);
}

export function getStoredPinSalt() {
  return localStorage.getItem(AUTH_CONFIG.storageKeys.pinSalt);
}

export function storePinForDisplay(pin) {
  localStorage.setItem(AUTH_CONFIG.storageKeys.pinDisplay, pin);
}

export function getStoredPinDisplay() {
  return localStorage.getItem(AUTH_CONFIG.storageKeys.pinDisplay);
}

export function hasStoredPinDisplay() {
  return Boolean(getStoredPinDisplay());
}

export function markDevicePinRegistered(userId, email, pinSalt, pinDisplay) {
  localStorage.setItem(AUTH_CONFIG.storageKeys.pinUserId, userId);
  localStorage.setItem(AUTH_CONFIG.storageKeys.pinUserEmail, email || '');
  localStorage.setItem(AUTH_CONFIG.storageKeys.pinEnabled, 'true');
  if (pinSalt) {
    storePinSalt(pinSalt);
  }
  if (pinDisplay) {
    storePinForDisplay(pinDisplay);
  }
  localStorage.removeItem(AUTH_CONFIG.storageKeys.pinUnlocked);
}

export function clearDevicePinRegistration() {
  localStorage.removeItem(AUTH_CONFIG.storageKeys.pinUserId);
  localStorage.removeItem(AUTH_CONFIG.storageKeys.pinUserEmail);
  localStorage.removeItem(AUTH_CONFIG.storageKeys.pinSalt);
  localStorage.removeItem(AUTH_CONFIG.storageKeys.pinDisplay);
  localStorage.removeItem(AUTH_CONFIG.storageKeys.pinEnabled);
  localStorage.removeItem(AUTH_CONFIG.storageKeys.pinUnlocked);
}

export function isPinUnlocked() {
  return sessionStorage.getItem(AUTH_CONFIG.storageKeys.pinUnlocked) === 'true';
}

export function setPinUnlocked(unlocked = true) {
  if (unlocked) {
    sessionStorage.setItem(AUTH_CONFIG.storageKeys.pinUnlocked, 'true');
  } else {
    sessionStorage.removeItem(AUTH_CONFIG.storageKeys.pinUnlocked);
  }
}

export function shouldShowPinEntry() {
  return Boolean(getStoredPinUser());
}

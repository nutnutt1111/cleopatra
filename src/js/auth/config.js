export const AUTH_CONFIG = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  redirectAfterLogin: import.meta.env.VITE_AUTH_REDIRECT || '/pages/index.html',
  maxPinAttempts: 5,
  routes: {
    login: '/login',
    setPin: '/set-pin',
    enterPin: '/enter-pin',
    forgotPassword: '/forgot-password',
    dashboard: '/pages/index.html',
    employeeSettings: '/pages/settings/employee.html',
  },
  storageKeys: {
    deviceId: 'employee_device_id',
    pinUserId: 'employee_pin_user_id',
    pinUserEmail: 'employee_pin_user_email',
    pinSalt: 'employee_pin_salt',
    pinDisplay: 'employee_pin_display',
    pinEnabled: 'employee_pin_enabled',
    pinUnlocked: 'employee_pin_unlocked',
  },
};

export function isSupabaseConfigured() {
  return Boolean(AUTH_CONFIG.supabaseUrl && AUTH_CONFIG.supabaseAnonKey);
}

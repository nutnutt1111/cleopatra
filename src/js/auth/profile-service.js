import { AUTH_CONFIG } from './config.js';
import { getSupabase } from './supabase.js';

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
  viewer: 'Viewer',
};

const STATUS_LABELS = {
  active: 'ใช้งาน',
  inactive: 'ปิดใช้งาน',
  pending: 'รอดำเนินการ',
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || 'Staff';
}

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || 'ใช้งาน';
}

export async function getEmployeeProfile(userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('employee_profiles')
    .select('full_name, role, status, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertEmployeeProfile(userId, payload) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('employee_profiles')
    .upsert(
      {
        user_id: userId,
        full_name: payload.fullName.trim(),
        role: payload.role || 'staff',
        status: payload.status || 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('full_name, role, status')
    .single();

  if (error) throw error;
  return data;
}

export async function listEmployees({ search = '', status = '' } = {}) {
  const supabase = getSupabase();
  let query = supabase
    .from('employee_profiles')
    .select('user_id, full_name, role, status, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  const normalizedSearch = search.trim().toLowerCase();
  if (!normalizedSearch) return data || [];

  return (data || []).filter((row) =>
    row.full_name?.toLowerCase().includes(normalizedSearch)
    || row.role?.toLowerCase().includes(normalizedSearch)
  );
}

export async function updateEmployeeStatus(userId, status) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('employee_profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select('user_id, status')
    .single();

  if (error) throw error;
  return data;
}

export async function createEmployeeAccount({ fullName, email, password, role, status }) {
  const supabase = getSupabase();
  const { data: sessionData } = await supabase.auth.getSession();
  const adminSession = sessionData?.session;

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: fullName.trim() },
    },
  });

  if (signUpError) throw signUpError;
  if (!signUpData.user) throw new Error('ไม่สามารถสร้างบัญชีได้');

  const newUserId = signUpData.user.id;

  const { error: profileError } = await supabase
    .from('employee_profiles')
    .upsert({
      user_id: newUserId,
      full_name: fullName.trim(),
      role: role || 'staff',
      status: status || 'pending',
      updated_at: new Date().toISOString(),
    });

  if (profileError) throw profileError;

  if (adminSession) {
    await supabase.auth.setSession({
      access_token: adminSession.access_token,
      refresh_token: adminSession.refresh_token,
    });
  }

  return { userId: newUserId, email: signUpData.user.email };
}

export function getDefaultEmployeeName(user) {
  if (!user) return '';

  const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;
  if (metadataName && typeof metadataName === 'string') {
    return metadataName.trim();
  }

  if (user.email) {
    return user.email.split('@')[0];
  }

  return '';
}

export function canManageEmployees(user, profile) {
  const appRole = user?.app_metadata?.role;
  if (appRole === AUTH_CONFIG.roles.admin || appRole === AUTH_CONFIG.roles.manager) {
    return true;
  }
  return profile?.role === AUTH_CONFIG.roles.admin || profile?.role === AUTH_CONFIG.roles.manager;
}

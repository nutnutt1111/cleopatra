import { getSupabase } from './supabase.js';

export async function getEmployeeProfile(userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('employee_profiles')
    .select('full_name, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertEmployeeProfile(userId, fullName) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('employee_profiles')
    .upsert(
      {
        user_id: userId,
        full_name: fullName.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('full_name')
    .single();

  if (error) throw error;
  return data;
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

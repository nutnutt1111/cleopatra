import { getSupabase } from './supabase.js';
import { getDeviceId, getStoredPinSalt, storePinSalt } from './device.js';
import { generatePinSalt, hashPin } from './pin-crypto.js';

export async function saveDevicePin(userId, pin) {
  const supabase = getSupabase();
  const deviceId = getDeviceId();
  const pinSalt = generatePinSalt();
  const pinHash = await hashPin(pin, pinSalt);

  const { error } = await supabase
    .from('employee_device_pins')
    .upsert(
      {
        user_id: userId,
        device_id: deviceId,
        pin_hash: pinHash,
        pin_salt: pinSalt,
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,device_id' }
    );

  if (error) throw error;

  storePinSalt(pinSalt);

  return { deviceId, pinSalt, pinHash };
}

export async function devicePinExists(userId) {
  const supabase = getSupabase();
  const deviceId = getDeviceId();

  const { data, error } = await supabase
    .from('employee_device_pins')
    .select('id, pin_salt')
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .maybeSingle();

  if (error) throw error;

  if (data?.pin_salt) {
    storePinSalt(data.pin_salt);
  }

  return Boolean(data);
}

export async function verifyDevicePin(userId, pin) {
  const supabase = getSupabase();
  const deviceId = getDeviceId();
  const pinSalt = getStoredPinSalt();

  if (!pinSalt) {
    return { success: false, error: 'not_found' };
  }

  const pinHash = await hashPin(pin, pinSalt);

  const { data, error } = await supabase.rpc('verify_device_pin', {
    p_user_id: userId,
    p_device_id: deviceId,
    p_pin_hash: pinHash,
  });

  if (error) throw error;
  return data;
}

export async function removeDevicePin(userId) {
  const supabase = getSupabase();
  const deviceId = getDeviceId();

  const { error } = await supabase
    .from('employee_device_pins')
    .delete()
    .eq('user_id', userId)
    .eq('device_id', deviceId);

  if (error) throw error;
}

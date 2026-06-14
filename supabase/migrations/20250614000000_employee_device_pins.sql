-- Employee device PIN quick-unlock schema
-- Primary auth remains Supabase Auth (auth.users)
-- PIN is device-scoped quick unlock only

CREATE TABLE IF NOT EXISTS public.employee_device_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employee_device_pins_user_device_unique UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS employee_device_pins_user_id_idx
  ON public.employee_device_pins (user_id);

CREATE INDEX IF NOT EXISTS employee_device_pins_device_id_idx
  ON public.employee_device_pins (device_id);

ALTER TABLE public.employee_device_pins ENABLE ROW LEVEL SECURITY;

-- Authenticated users manage only their own device PIN records
CREATE POLICY "Users can view own device pins"
  ON public.employee_device_pins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own device pins"
  ON public.employee_device_pins
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own device pins"
  ON public.employee_device_pins
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own device pins"
  ON public.employee_device_pins
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Verify PIN without requiring an active session (quick unlock gate)
-- Uses SECURITY DEFINER; never expose stored hash to client SELECT
CREATE OR REPLACE FUNCTION public.verify_device_pin(
  p_user_id UUID,
  p_device_id TEXT,
  p_pin_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record public.employee_device_pins%ROWTYPE;
  v_new_attempts INTEGER;
BEGIN
  IF p_user_id IS NULL OR p_device_id IS NULL OR p_pin_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_request');
  END IF;

  SELECT * INTO v_record
  FROM public.employee_device_pins
  WHERE user_id = p_user_id
    AND device_id = p_device_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_record.locked_until IS NOT NULL AND v_record.locked_until > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'locked',
      'locked_until', v_record.locked_until
    );
  END IF;

  IF v_record.pin_hash = p_pin_hash THEN
    UPDATE public.employee_device_pins
    SET failed_attempts = 0,
        locked_until = NULL,
        updated_at = now()
    WHERE id = v_record.id;

    RETURN jsonb_build_object('success', true);
  END IF;

  v_new_attempts := v_record.failed_attempts + 1;

  UPDATE public.employee_device_pins
  SET failed_attempts = v_new_attempts,
      locked_until = CASE
        WHEN v_new_attempts >= 5 THEN now() + interval '15 minutes'
        ELSE locked_until
      END,
      updated_at = now()
  WHERE id = v_record.id;

  RETURN jsonb_build_object(
    'success', false,
    'error', CASE WHEN v_new_attempts >= 5 THEN 'max_attempts' ELSE 'invalid_pin' END,
    'failed_attempts', v_new_attempts,
    'max_attempts', 5
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_device_pin(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_device_pin(UUID, TEXT, TEXT) TO anon, authenticated;

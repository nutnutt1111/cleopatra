-- Extend employee_profiles with role and status for settings management

ALTER TABLE public.employee_profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'staff',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE public.employee_profiles
  DROP CONSTRAINT IF EXISTS employee_profiles_role_check;

ALTER TABLE public.employee_profiles
  ADD CONSTRAINT employee_profiles_role_check
  CHECK (role IN ('admin', 'manager', 'staff', 'viewer'));

ALTER TABLE public.employee_profiles
  DROP CONSTRAINT IF EXISTS employee_profiles_status_check;

ALTER TABLE public.employee_profiles
  ADD CONSTRAINT employee_profiles_status_check
  CHECK (status IN ('active', 'inactive', 'pending'));

CREATE INDEX IF NOT EXISTS employee_profiles_role_idx ON public.employee_profiles (role);
CREATE INDEX IF NOT EXISTS employee_profiles_status_idx ON public.employee_profiles (status);

-- Drop old SELECT policy and replace with own + admin/manager access
DROP POLICY IF EXISTS "Users can view own profile" ON public.employee_profiles;

CREATE POLICY "Users can view own profile"
  ON public.employee_profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'manager')
    OR EXISTS (
      SELECT 1
      FROM public.employee_profiles AS manager_profile
      WHERE manager_profile.user_id = auth.uid()
        AND manager_profile.role IN ('admin', 'manager')
    )
  );

-- Admins/managers can insert profiles for new employees
CREATE POLICY "Admins can insert employee profiles"
  ON public.employee_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'manager')
    OR EXISTS (
      SELECT 1
      FROM public.employee_profiles AS manager_profile
      WHERE manager_profile.user_id = auth.uid()
        AND manager_profile.role IN ('admin', 'manager')
    )
  );

-- Admins/managers can update any profile; users update own
DROP POLICY IF EXISTS "Users can update own profile" ON public.employee_profiles;

CREATE POLICY "Users can update own profile"
  ON public.employee_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'manager')
    OR EXISTS (
      SELECT 1
      FROM public.employee_profiles AS manager_profile
      WHERE manager_profile.user_id = auth.uid()
        AND manager_profile.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'manager')
    OR EXISTS (
      SELECT 1
      FROM public.employee_profiles AS manager_profile
      WHERE manager_profile.user_id = auth.uid()
        AND manager_profile.role IN ('admin', 'manager')
    )
  );

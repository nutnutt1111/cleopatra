-- Fix employee_profiles RLS recursion and auto-provision profiles on signup
--
-- Migration 002 used EXISTS subqueries on employee_profiles inside RLS policies,
-- which can cause infinite recursion. This migration replaces those checks with
-- a SECURITY DEFINER helper that bypasses RLS safely.

CREATE OR REPLACE FUNCTION public.is_employee_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'manager')
    OR EXISTS (
      SELECT 1
      FROM public.employee_profiles AS ep
      WHERE ep.user_id = auth.uid()
        AND ep.role IN ('admin', 'manager')
    );
$$;

REVOKE ALL ON FUNCTION public.is_employee_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_employee_manager() TO authenticated;

-- SELECT: own row or manager/admin
DROP POLICY IF EXISTS "Users can view own profile" ON public.employee_profiles;

CREATE POLICY "Users can view own profile"
  ON public.employee_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_employee_manager());

-- INSERT: own row on first login, or manager/admin creating staff
DROP POLICY IF EXISTS "Users can insert own profile" ON public.employee_profiles;
DROP POLICY IF EXISTS "Admins can insert employee profiles" ON public.employee_profiles;

CREATE POLICY "Users can insert employee profiles"
  ON public.employee_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_employee_manager());

-- UPDATE: own row or manager/admin
DROP POLICY IF EXISTS "Users can update own profile" ON public.employee_profiles;

CREATE POLICY "Users can update employee profiles"
  ON public.employee_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_employee_manager())
  WITH CHECK (auth.uid() = user_id OR public.is_employee_manager());

-- Auto-create employee_profiles row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.employee_profiles (user_id, full_name, role, status)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
      NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    'staff',
    'active'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_employee_profile ON auth.users;

CREATE TRIGGER on_auth_user_created_employee_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user_profile();

-- Backfill profiles for existing auth users (safe to re-run)
INSERT INTO public.employee_profiles (user_id, full_name, role, status)
SELECT
  u.id,
  COALESCE(
    NULLIF(TRIM(u.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(u.raw_user_meta_data ->> 'name'), ''),
    split_part(COALESCE(u.email, ''), '@', 1),
    ''
  ),
  'staff',
  'active'
FROM auth.users AS u
LEFT JOIN public.employee_profiles AS ep ON ep.user_id = u.id
WHERE ep.user_id IS NULL;

-- Bootstrap first admin (run manually once after deploy):
-- UPDATE public.employee_profiles SET role = 'admin' WHERE user_id = '<your-user-uuid>';

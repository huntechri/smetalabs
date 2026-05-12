-- ============================================================================
-- Migration: 005_rls_advisor_cleanup
-- Description: advisor cleanup for RBAC/workspace auth tables
-- Date: 2026-05-12
-- ============================================================================

-- Make helper functions deterministic with an explicit search_path.
CREATE OR REPLACE FUNCTION public.user_role(role_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = (select auth.uid())
      AND r.name = role_name
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
SET search_path = ''
STABLE
AS $$ SELECT public.user_role('owner'); $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SET search_path = ''
STABLE
AS $$ SELECT public.user_role('admin'); $$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
SET search_path = ''
STABLE
AS $$ SELECT public.user_role('manager'); $$;

CREATE OR REPLACE FUNCTION public.is_estimator()
RETURNS boolean
LANGUAGE sql
SET search_path = ''
STABLE
AS $$ SELECT public.user_role('estimator'); $$;

CREATE OR REPLACE FUNCTION public.is_viewer()
RETURNS boolean
LANGUAGE sql
SET search_path = ''
STABLE
AS $$ SELECT public.user_role('viewer'); $$;

CREATE OR REPLACE FUNCTION public.can_write()
RETURNS boolean
LANGUAGE sql
SET search_path = ''
STABLE
AS $$ SELECT public.is_owner() OR public.is_admin() OR public.is_manager(); $$;

CREATE OR REPLACE FUNCTION public.can_read()
RETURNS boolean
LANGUAGE sql
SET search_path = ''
STABLE
AS $$
  SELECT public.is_owner() OR public.is_admin() OR public.is_manager()
      OR public.is_estimator() OR public.is_viewer();
$$;

CREATE OR REPLACE FUNCTION public.update_user_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Remove legacy duplicate/broad policies left by earlier experiments.
DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can read roles" ON public.roles;
DROP POLICY IF EXISTS "Admin can insert roles" ON public.roles;
DROP POLICY IF EXISTS "Admin can update roles" ON public.roles;
DROP POLICY IF EXISTS "Admin can delete roles" ON public.roles;
DROP POLICY IF EXISTS "Authenticated can read permissions" ON public.permissions;
DROP POLICY IF EXISTS "Admin can insert permissions" ON public.permissions;
DROP POLICY IF EXISTS "Admin can update permissions" ON public.permissions;
DROP POLICY IF EXISTS "Admin can delete permissions" ON public.permissions;
DROP POLICY IF EXISTS "Authenticated can read role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admin can insert role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admin can update role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admin can delete role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Users can read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can delete user_roles" ON public.user_roles;

-- Recreate common auth.uid/auth.role policies in initplan-friendly form.
DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
CREATE POLICY "users_read_own_profile" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "users_insert_own_profile" ON public.profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "authenticated_read_roles" ON public.roles;
CREATE POLICY "authenticated_read_roles" ON public.roles
  FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "authenticated_read_permissions" ON public.permissions;
CREATE POLICY "authenticated_read_permissions" ON public.permissions
  FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "authenticated_read_role_permissions" ON public.role_permissions;
CREATE POLICY "authenticated_read_role_permissions" ON public.role_permissions
  FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "users_read_own_roles" ON public.user_roles;
CREATE POLICY "users_read_own_roles" ON public.user_roles
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings" ON public.user_settings
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
CREATE POLICY "Users can insert own settings" ON public.user_settings
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can update own settings" ON public.user_settings
  FOR UPDATE USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Cover foreign keys reported by the performance advisor.
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by ON public.user_roles(assigned_by);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role_id ON public.workspace_members(role_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_role_id ON public.workspace_invitations(role_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_owner_id ON public.workspace_invitations(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_invited_by ON public.workspace_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_workspace_allowed_domains_added_by ON public.workspace_allowed_domains(added_by);

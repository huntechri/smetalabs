-- ============================================================================
-- Migration: 007_advisor_policy_grants
-- Description: hide security definer functions from RPC and merge duplicate RLS policies
-- Date: 2026-05-12
-- ============================================================================

-- SECURITY DEFINER helpers are for triggers/RLS only; they must not be exposed
-- as callable RPC functions to anon/authenticated users.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_role(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.user_role(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.workspace_role_for(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.workspace_can_manage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.workspace_can_read_team(uuid) FROM PUBLIC, anon, authenticated;

-- Merge overlapping SELECT policies to avoid multiple permissive-policy checks.
DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_read_all_profiles" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    (select auth.uid()) = id
    OR public.is_admin()
    OR public.is_owner()
  );

DROP POLICY IF EXISTS "users_read_own_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_read_all_user_roles" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR public.is_admin()
    OR public.is_owner()
  );

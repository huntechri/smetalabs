-- ============================================================================
-- Migration: 008_private_rls_helpers
-- Description: move SECURITY DEFINER RLS helpers out of exposed public schema
-- Date: 2026-05-12
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.user_role(role_name text)
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

CREATE OR REPLACE FUNCTION private.workspace_role_for(workspace_owner_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT r.name
  FROM public.workspace_members wm
  JOIN public.roles r ON r.id = wm.role_id
  WHERE wm.user_id = (select auth.uid())
    AND wm.owner_id = workspace_owner_id
    AND wm.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.workspace_can_manage(workspace_owner_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT (select auth.uid()) = workspace_owner_id
    OR private.workspace_role_for(workspace_owner_id) IN ('owner', 'admin');
$$;

CREATE OR REPLACE FUNCTION private.workspace_can_read_team(workspace_owner_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT (select auth.uid()) = workspace_owner_id
    OR private.workspace_role_for(workspace_owner_id) IN ('owner', 'admin', 'manager');
$$;

GRANT EXECUTE ON FUNCTION private.user_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workspace_role_for(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workspace_can_manage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.workspace_can_read_team(uuid) TO authenticated;

-- Keep public convenience wrappers SECURITY INVOKER; RPC execution no longer bypasses RLS.
CREATE OR REPLACE FUNCTION public.user_role(role_name text)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$ SELECT private.user_role(role_name); $$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$ SELECT private.user_role('owner'); $$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$ SELECT private.user_role('admin'); $$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$ SELECT private.user_role('manager'); $$;

CREATE OR REPLACE FUNCTION public.is_estimator()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$ SELECT private.user_role('estimator'); $$;

CREATE OR REPLACE FUNCTION public.is_viewer()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$ SELECT private.user_role('viewer'); $$;

CREATE OR REPLACE FUNCTION public.can_write()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$ SELECT public.is_owner() OR public.is_admin() OR public.is_manager(); $$;

CREATE OR REPLACE FUNCTION public.can_read()
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
  SELECT public.is_owner() OR public.is_admin() OR public.is_manager()
      OR public.is_estimator() OR public.is_viewer();
$$;

CREATE OR REPLACE FUNCTION public.workspace_role_for(workspace_owner_id uuid)
RETURNS text
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$ SELECT private.workspace_role_for(workspace_owner_id); $$;

CREATE OR REPLACE FUNCTION public.workspace_can_manage(workspace_owner_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$ SELECT private.workspace_can_manage(workspace_owner_id); $$;

CREATE OR REPLACE FUNCTION public.workspace_can_read_team(workspace_owner_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$ SELECT private.workspace_can_read_team(workspace_owner_id); $$;

-- Policies call private helpers directly; no exposed SECURITY DEFINER RPC is needed.
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (
    (select auth.uid()) = id
    OR private.user_role('admin')
    OR private.user_role('owner')
  );

DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR private.user_role('admin')
    OR private.user_role('owner')
  );

DROP POLICY IF EXISTS "workspace_members_select" ON public.workspace_members;
CREATE POLICY "workspace_members_select" ON public.workspace_members
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR private.workspace_can_read_team(owner_id)
  );

DROP POLICY IF EXISTS "workspace_members_insert" ON public.workspace_members;
CREATE POLICY "workspace_members_insert" ON public.workspace_members
  FOR INSERT WITH CHECK (private.workspace_can_manage(owner_id));

DROP POLICY IF EXISTS "workspace_members_update" ON public.workspace_members;
CREATE POLICY "workspace_members_update" ON public.workspace_members
  FOR UPDATE USING (private.workspace_can_manage(owner_id))
  WITH CHECK (private.workspace_can_manage(owner_id));

DROP POLICY IF EXISTS "workspace_members_delete" ON public.workspace_members;
CREATE POLICY "workspace_members_delete" ON public.workspace_members
  FOR DELETE USING (private.workspace_can_manage(owner_id));

DROP POLICY IF EXISTS "workspace_invitations_select" ON public.workspace_invitations;
CREATE POLICY "workspace_invitations_select" ON public.workspace_invitations
  FOR SELECT USING (private.workspace_can_read_team(owner_id));

DROP POLICY IF EXISTS "workspace_invitations_insert" ON public.workspace_invitations;
CREATE POLICY "workspace_invitations_insert" ON public.workspace_invitations
  FOR INSERT WITH CHECK (private.workspace_can_manage(owner_id));

DROP POLICY IF EXISTS "workspace_invitations_update" ON public.workspace_invitations;
CREATE POLICY "workspace_invitations_update" ON public.workspace_invitations
  FOR UPDATE USING (private.workspace_can_manage(owner_id))
  WITH CHECK (private.workspace_can_manage(owner_id));

DROP POLICY IF EXISTS "workspace_invitations_delete" ON public.workspace_invitations;
CREATE POLICY "workspace_invitations_delete" ON public.workspace_invitations
  FOR DELETE USING (private.workspace_can_manage(owner_id));

DROP POLICY IF EXISTS "workspace_allowed_domains_select" ON public.workspace_allowed_domains;
CREATE POLICY "workspace_allowed_domains_select" ON public.workspace_allowed_domains
  FOR SELECT USING (private.workspace_can_read_team(owner_id));

DROP POLICY IF EXISTS "workspace_allowed_domains_insert" ON public.workspace_allowed_domains;
CREATE POLICY "workspace_allowed_domains_insert" ON public.workspace_allowed_domains
  FOR INSERT WITH CHECK (private.workspace_can_manage(owner_id));

DROP POLICY IF EXISTS "workspace_allowed_domains_update" ON public.workspace_allowed_domains;
CREATE POLICY "workspace_allowed_domains_update" ON public.workspace_allowed_domains
  FOR UPDATE USING (private.workspace_can_manage(owner_id))
  WITH CHECK (private.workspace_can_manage(owner_id));

DROP POLICY IF EXISTS "workspace_allowed_domains_delete" ON public.workspace_allowed_domains;
CREATE POLICY "workspace_allowed_domains_delete" ON public.workspace_allowed_domains
  FOR DELETE USING (private.workspace_can_manage(owner_id));

-- Tighten private helper grants after creation (functions inherit EXECUTE to PUBLIC by default).
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;

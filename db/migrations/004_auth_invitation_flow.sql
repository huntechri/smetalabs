-- ============================================================================
-- Migration: 004_auth_invitation_flow
-- Description: profile/user_settings bootstrap, invitation acceptance, workspace-scoped RLS
-- Date: 2026-05-12
-- ============================================================================

-- Normalize invitation emails for uniqueness checks.
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_invitations_lower_email_owner
  ON public.workspace_invitations (lower(email), owner_id);

-- A safe helper for RLS and server checks. It intentionally runs as SECURITY
-- DEFINER to avoid self-recursion when workspace_members policies need to check
-- the caller's membership in the same workspace.
CREATE OR REPLACE FUNCTION public.workspace_role_for(workspace_owner_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT r.name
  FROM public.workspace_members wm
  JOIN public.roles r ON r.id = wm.role_id
  WHERE wm.owner_id = workspace_owner_id
    AND wm.user_id = (select auth.uid())
    AND wm.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.workspace_can_manage(workspace_owner_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT (select auth.uid()) = workspace_owner_id
    OR public.workspace_role_for(workspace_owner_id) IN ('owner', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.workspace_can_read_team(workspace_owner_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT (select auth.uid()) = workspace_owner_id
    OR public.workspace_role_for(workspace_owner_id) IN ('owner', 'admin', 'manager');
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_role_id uuid;
  assigned_role_id uuid;
  invitation_row public.workspace_invitations%ROWTYPE;
  invited_by_id uuid;
  invited_role_name text;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO invitation_row
  FROM public.workspace_invitations wi
  WHERE wi.id::text = NEW.raw_user_meta_data->>'invitation_id'
    AND lower(wi.email) = lower(COALESCE(NEW.email, ''))
    AND wi.status = 'pending'
    AND wi.expires_at > now()
  LIMIT 1;

  IF FOUND THEN
    assigned_role_id := invitation_row.role_id;

    INSERT INTO public.workspace_members (user_id, owner_id, role_id, status, joined_at)
    VALUES (NEW.id, invitation_row.owner_id, assigned_role_id, 'active', now())
    ON CONFLICT (user_id, owner_id) DO UPDATE
      SET role_id = EXCLUDED.role_id,
          status = 'active',
          joined_at = COALESCE(public.workspace_members.joined_at, now()),
          updated_at = now();

    INSERT INTO public.user_roles (user_id, role_id, assigned_by)
    VALUES (NEW.id, assigned_role_id, invitation_row.invited_by)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    DELETE FROM public.workspace_invitations WHERE id = invitation_row.id;
  ELSE
    SELECT id INTO owner_role_id FROM public.roles WHERE name = 'owner' LIMIT 1;

    IF owner_role_id IS NOT NULL THEN
      INSERT INTO public.workspace_members (user_id, owner_id, role_id, status, joined_at)
      VALUES (NEW.id, NEW.id, owner_role_id, 'active', now())
      ON CONFLICT (user_id, owner_id) DO NOTHING;

      INSERT INTO public.user_roles (user_id, role_id)
      VALUES (NEW.id, owner_role_id)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Align constraints with the Drizzle schema and required invite uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_members_user_owner
  ON public.workspace_members (user_id, owner_id);

-- Backfill existing users created before this migration.
INSERT INTO public.user_settings (user_id)
SELECT p.id FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.workspace_members (user_id, owner_id, role_id, status, joined_at)
SELECT
  u.id,
  COALESCE((u.raw_user_meta_data->>'invited_by')::uuid, u.id) AS owner_id,
  r.id AS role_id,
  'active'::public.workspace_member_status,
  COALESCE(u.email_confirmed_at, u.created_at, now())
FROM auth.users u
JOIN public.roles r
  ON r.name = COALESCE(NULLIF(u.raw_user_meta_data->>'workspace_role', ''), 'owner')
JOIN public.profiles owner_profile
  ON owner_profile.id = COALESCE((u.raw_user_meta_data->>'invited_by')::uuid, u.id)
ON CONFLICT (user_id, owner_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role_id, assigned_by)
SELECT
  u.id,
  r.id,
  (u.raw_user_meta_data->>'invited_by')::uuid
FROM auth.users u
JOIN public.roles r
  ON r.name = COALESCE(NULLIF(u.raw_user_meta_data->>'workspace_role', ''), 'owner')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Rebuild workspace RLS policies to scope permissions to the target workspace.
DROP POLICY IF EXISTS "owner_admin_full_access" ON public.workspace_members;
DROP POLICY IF EXISTS "manager_read_members" ON public.workspace_members;
DROP POLICY IF EXISTS "estimator_viewer_read_own" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON public.workspace_members;

CREATE POLICY "workspace_members_select" ON public.workspace_members
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR public.workspace_can_read_team(owner_id)
  );

CREATE POLICY "workspace_members_insert" ON public.workspace_members
  FOR INSERT WITH CHECK (public.workspace_can_manage(owner_id));

CREATE POLICY "workspace_members_update" ON public.workspace_members
  FOR UPDATE USING (public.workspace_can_manage(owner_id))
  WITH CHECK (public.workspace_can_manage(owner_id));

CREATE POLICY "workspace_members_delete" ON public.workspace_members
  FOR DELETE USING (public.workspace_can_manage(owner_id));

DROP POLICY IF EXISTS "owner_admin_full_access_invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "manager_read_invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_select" ON public.workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_insert" ON public.workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_update" ON public.workspace_invitations;
DROP POLICY IF EXISTS "workspace_invitations_delete" ON public.workspace_invitations;

CREATE POLICY "workspace_invitations_select" ON public.workspace_invitations
  FOR SELECT USING (public.workspace_can_read_team(owner_id));

CREATE POLICY "workspace_invitations_insert" ON public.workspace_invitations
  FOR INSERT WITH CHECK (public.workspace_can_manage(owner_id));

CREATE POLICY "workspace_invitations_update" ON public.workspace_invitations
  FOR UPDATE USING (public.workspace_can_manage(owner_id))
  WITH CHECK (public.workspace_can_manage(owner_id));

CREATE POLICY "workspace_invitations_delete" ON public.workspace_invitations
  FOR DELETE USING (public.workspace_can_manage(owner_id));

DROP POLICY IF EXISTS "owner_admin_full_access_domains" ON public.workspace_allowed_domains;
DROP POLICY IF EXISTS "manager_read_domains" ON public.workspace_allowed_domains;
DROP POLICY IF EXISTS "workspace_allowed_domains_select" ON public.workspace_allowed_domains;
DROP POLICY IF EXISTS "workspace_allowed_domains_insert" ON public.workspace_allowed_domains;
DROP POLICY IF EXISTS "workspace_allowed_domains_update" ON public.workspace_allowed_domains;
DROP POLICY IF EXISTS "workspace_allowed_domains_delete" ON public.workspace_allowed_domains;

CREATE POLICY "workspace_allowed_domains_select" ON public.workspace_allowed_domains
  FOR SELECT USING (public.workspace_can_read_team(owner_id));

CREATE POLICY "workspace_allowed_domains_insert" ON public.workspace_allowed_domains
  FOR INSERT WITH CHECK (public.workspace_can_manage(owner_id));

CREATE POLICY "workspace_allowed_domains_update" ON public.workspace_allowed_domains
  FOR UPDATE USING (public.workspace_can_manage(owner_id))
  WITH CHECK (public.workspace_can_manage(owner_id));

CREATE POLICY "workspace_allowed_domains_delete" ON public.workspace_allowed_domains
  FOR DELETE USING (public.workspace_can_manage(owner_id));

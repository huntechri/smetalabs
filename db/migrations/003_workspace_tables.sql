-- ============================================================================
-- Миграция: 003_workspace_tables
-- Описание: workspace_members, workspace_invitations, workspace_allowed_domains + RLS
-- Дата: 2026-05-12
-- ============================================================================

-- 1. ENUM types
DO $$ BEGIN
  CREATE TYPE workspace_member_status AS ENUM ('active', 'invited', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. workspace_members
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  status workspace_member_status NOT NULL DEFAULT 'active',
  joined_at timestamptz,
  last_active_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_owner_id ON public.workspace_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_status ON public.workspace_members(status);

-- 3. workspace_invitations
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  email text NOT NULL,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text,
  invited_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_invitations_email_owner
  ON public.workspace_invitations(email, owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_status
  ON public.workspace_invitations(status);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_expires_at_pending
  ON public.workspace_invitations(expires_at) WHERE status = 'pending';

-- 4. workspace_allowed_domains
CREATE TABLE IF NOT EXISTS public.workspace_allowed_domains (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  domain text NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_allowed_domains_domain_owner
  ON public.workspace_allowed_domains(domain, owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_allowed_domains_owner_id
  ON public.workspace_allowed_domains(owner_id);

-- 5. Enable RLS
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_allowed_domains ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for workspace_members

-- owner + admin: full access
CREATE POLICY "owner_admin_full_access" ON public.workspace_members
  FOR ALL USING (
    public.is_owner() OR public.is_admin()
  );

-- manager: read only
CREATE POLICY "manager_read_members" ON public.workspace_members
  FOR SELECT USING (public.is_manager());

-- estimator + viewer: can only see their own record
CREATE POLICY "estimator_viewer_read_own" ON public.workspace_members
  FOR SELECT USING (
    (public.is_estimator() OR public.is_viewer()) AND user_id = auth.uid()
  );

-- 7. RLS Policies for workspace_invitations

-- owner + admin: full access
CREATE POLICY "owner_admin_full_access_invitations" ON public.workspace_invitations
  FOR ALL USING (
    public.is_owner() OR public.is_admin()
  );

-- manager: read only
CREATE POLICY "manager_read_invitations" ON public.workspace_invitations
  FOR SELECT USING (public.is_manager());

-- 8. RLS Policies for workspace_allowed_domains

-- owner + admin: full access
CREATE POLICY "owner_admin_full_access_domains" ON public.workspace_allowed_domains
  FOR ALL USING (
    public.is_owner() OR public.is_admin()
  );

-- manager: read only
CREATE POLICY "manager_read_domains" ON public.workspace_allowed_domains
  FOR SELECT USING (public.is_manager());

-- 9. Grant API access to anon/authenticated roles (Data API)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_members TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_invitations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_allowed_domains TO anon, authenticated;

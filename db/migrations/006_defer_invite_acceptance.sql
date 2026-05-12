-- ============================================================================
-- Migration: 006_defer_invite_acceptance
-- Description: keep invitations pending until the invitee verifies/signs in
-- Date: 2026-05-12
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_role_id uuid;
  invitation_row public.workspace_invitations%ROWTYPE;
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
    -- Supabase Auth creates the auth.users row when the invite is sent.
    -- Keep the workspace invitation pending until /auth/callback confirms it.
    INSERT INTO public.workspace_members (user_id, owner_id, role_id, status, joined_at)
    VALUES (NEW.id, invitation_row.owner_id, invitation_row.role_id, 'invited', NULL)
    ON CONFLICT (user_id, owner_id) DO UPDATE
      SET role_id = EXCLUDED.role_id,
          status = 'invited',
          updated_at = now();
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

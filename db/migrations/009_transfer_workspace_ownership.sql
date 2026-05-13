-- ============================================================================
-- Migration: 009_transfer_workspace_ownership
-- Description: Atomic helper for implicit owner_id workspace ownership transfer.
-- Date: 2026-05-13
-- ============================================================================

CREATE OR REPLACE FUNCTION public.transfer_workspace_ownership(
  p_old_owner_id uuid,
  p_new_owner_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_owner_role_id uuid;
  v_admin_role_id uuid;
  v_workspace_name text;
  v_workspace_settings jsonb;
BEGIN
  IF p_old_owner_id IS NULL OR p_new_owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner ids are required';
  END IF;

  IF p_old_owner_id = p_new_owner_id THEN
    RAISE EXCEPTION 'New owner is already the current owner';
  END IF;

  SELECT id INTO v_owner_role_id FROM public.roles WHERE name = 'owner' LIMIT 1;
  SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'admin' LIMIT 1;

  IF v_owner_role_id IS NULL OR v_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Required owner/admin roles are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = p_old_owner_id
      AND owner_id = p_old_owner_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Current owner workspace membership not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = p_new_owner_id
      AND owner_id = p_old_owner_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'New owner must be an active member of the current workspace';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE user_id = p_new_owner_id
      AND owner_id = p_new_owner_id
  ) THEN
    RAISE EXCEPTION 'New owner already owns another workspace';
  END IF;

  SELECT workspace_name
    INTO v_workspace_name
  FROM public.profiles
  WHERE id = p_old_owner_id;

  SELECT workspace
    INTO v_workspace_settings
  FROM public.user_settings
  WHERE user_id = p_old_owner_id;

  DELETE FROM public.workspace_members
  WHERE user_id = p_new_owner_id
    AND owner_id = p_old_owner_id;

  UPDATE public.workspace_members
  SET owner_id = p_new_owner_id,
      updated_at = now()
  WHERE owner_id = p_old_owner_id;

  UPDATE public.workspace_invitations
  SET owner_id = p_new_owner_id
  WHERE owner_id = p_old_owner_id;

  UPDATE public.workspace_allowed_domains
  SET owner_id = p_new_owner_id
  WHERE owner_id = p_old_owner_id;

  UPDATE public.workspace_members
  SET role_id = v_owner_role_id,
      status = 'active',
      joined_at = COALESCE(joined_at, now()),
      updated_at = now()
  WHERE user_id = p_new_owner_id
    AND owner_id = p_new_owner_id;

  UPDATE public.workspace_members
  SET role_id = v_admin_role_id,
      status = 'active',
      updated_at = now()
  WHERE user_id = p_old_owner_id
    AND owner_id = p_new_owner_id;

  UPDATE public.profiles
  SET workspace_name = v_workspace_name,
      updated_at = now()
  WHERE id = p_new_owner_id;

  UPDATE public.profiles
  SET workspace_name = NULL,
      workspace_logo = NULL,
      updated_at = now()
  WHERE id = p_old_owner_id;

  INSERT INTO public.user_settings (user_id, workspace, created_at, updated_at)
  VALUES (p_new_owner_id, COALESCE(v_workspace_settings, '{}'::jsonb), now(), now())
  ON CONFLICT (user_id) DO UPDATE
  SET workspace = COALESCE(v_workspace_settings, '{}'::jsonb),
      updated_at = now();

  UPDATE public.user_settings
  SET workspace = '{}'::jsonb,
      updated_at = now()
  WHERE user_id = p_old_owner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_workspace_ownership(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_workspace_ownership(uuid, uuid) TO service_role;

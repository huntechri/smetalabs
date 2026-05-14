-- ============================================================================
-- Migration: 014_private_service_role_grants
-- Description: Allow server-side service_role writes to execute private directory works helpers.
-- Date: 2026-05-14
-- ============================================================================

-- Server API repositories use SUPABASE_SERVICE_ROLE_KEY after explicit
-- application-level authorization checks. Direct writes to directory_works fire
-- trigger functions in the private schema, so service_role must be able to
-- resolve and execute those helper functions. Browser roles remain restricted.
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role;

-- Keep authenticated browser access for RLS policies and invoker wrappers that
-- already depend on private helpers.
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;

REVOKE USAGE ON SCHEMA private FROM PUBLIC, anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon;

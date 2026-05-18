-- ============================================================================
-- Migration: 027_projects_function_grants
-- Description: Grants for project helper functions used by project save triggers.
-- Date: 2026-05-17
-- ============================================================================

GRANT EXECUTE ON FUNCTION private.project_normalize(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.project_build_search_text(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.set_project_search_fields() TO authenticated, service_role;

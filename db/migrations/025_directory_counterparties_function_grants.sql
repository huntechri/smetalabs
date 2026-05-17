-- ============================================================================
-- Migration: 025_directory_counterparties_function_grants
-- Description: Grants for directory counterparties trigger helper functions.
-- Date: 2026-05-17
-- ============================================================================

GRANT USAGE ON SCHEMA private TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.directory_counterparty_normalize(text)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.directory_counterparty_build_search_text(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.set_directory_counterparty_search_fields()
  TO authenticated, service_role;

-- ============================================================================
-- Migration: 034_project_estimate_content_foundation
-- Description: Storage foundation for project estimate sections, works and materials.
-- Scope: database only; no API routes, UI, import, export or procurement integration.
-- Date: 2026-05-19
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_project_estimate_records_id_workspace_project'
      AND conrelid = 'public.project_estimate_records'::regclass
  ) THEN
    ALTER TABLE public.project_estimate_records
      ADD CONSTRAINT uq_project_estimate_records_id_workspace_project
      UNIQUE (id, workspace_owner_id, project_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.project_estimate_sections (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  estimate_record_id uuid NOT NULL,
  title text NOT NULL,
  number text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  works_amount numeric(14, 2) NOT NULL DEFAULT 0,
  materials_amount numeric(14, 2) NOT NULL DEFAULT 0,
  total_amount numeric(14, 2) NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT uq_project_estimate_sections_id_workspace_project_record
    UNIQUE (id, workspace_owner_id, project_id, estimate_record_id),
  CONSTRAINT fk_project_estimate_sections_record_workspace_project
    FOREIGN KEY (estimate_record_id, workspace_owner_id, project_id)
    REFERENCES public.project_estimate_records(id, workspace_owner_id, project_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_project_estimate_sections_title_not_empty CHECK (btrim(title) <> ''),
  CONSTRAINT chk_project_estimate_sections_number_not_empty CHECK (btrim(number) <> ''),
  CONSTRAINT chk_project_estimate_sections_amounts_non_negative CHECK (
    works_amount >= 0 AND materials_amount >= 0 AND total_amount >= 0
  )
);

CREATE TABLE IF NOT EXISTS public.project_estimate_works (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  estimate_record_id uuid NOT NULL,
  section_id uuid NOT NULL,
  directory_work_id uuid,
  directory_work_version integer,
  number text NOT NULL,
  code text,
  title text NOT NULL,
  unit_code text NOT NULL,
  unit_label text NOT NULL,
  quantity numeric(14, 3) NOT NULL DEFAULT 0,
  price numeric(14, 2) NOT NULL DEFAULT 0,
  total_amount numeric(14, 2) NOT NULL DEFAULT 0,
  category text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT uq_project_estimate_works_id_workspace_project_record_section
    UNIQUE (id, workspace_owner_id, project_id, estimate_record_id, section_id),
  CONSTRAINT fk_project_estimate_works_record_workspace_project
    FOREIGN KEY (estimate_record_id, workspace_owner_id, project_id)
    REFERENCES public.project_estimate_records(id, workspace_owner_id, project_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_project_estimate_works_section_workspace_project_record
    FOREIGN KEY (section_id, workspace_owner_id, project_id, estimate_record_id)
    REFERENCES public.project_estimate_sections(id, workspace_owner_id, project_id, estimate_record_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_project_estimate_works_directory_work_workspace
    FOREIGN KEY (directory_work_id, workspace_owner_id)
    REFERENCES public.directory_works(id, workspace_owner_id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_project_estimate_works_number_not_empty CHECK (btrim(number) <> ''),
  CONSTRAINT chk_project_estimate_works_title_not_empty CHECK (btrim(title) <> ''),
  CONSTRAINT chk_project_estimate_works_unit_code_not_empty CHECK (btrim(unit_code) <> ''),
  CONSTRAINT chk_project_estimate_works_unit_label_not_empty CHECK (btrim(unit_label) <> ''),
  CONSTRAINT chk_project_estimate_works_quantity_non_negative CHECK (quantity >= 0),
  CONSTRAINT chk_project_estimate_works_price_non_negative CHECK (price >= 0),
  CONSTRAINT chk_project_estimate_works_total_non_negative CHECK (total_amount >= 0),
  CONSTRAINT chk_project_estimate_works_directory_version_positive CHECK (
    directory_work_version IS NULL OR directory_work_version > 0
  )
);

CREATE TABLE IF NOT EXISTS public.project_estimate_materials (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  estimate_record_id uuid NOT NULL,
  section_id uuid NOT NULL,
  work_id uuid NOT NULL,
  directory_material_id uuid,
  directory_material_version integer,
  number text NOT NULL,
  code text,
  title text NOT NULL,
  unit_code text NOT NULL,
  unit_label text NOT NULL,
  quantity numeric(14, 3) NOT NULL DEFAULT 0,
  consumption numeric(14, 6),
  price numeric(14, 2) NOT NULL DEFAULT 0,
  total_amount numeric(14, 2) NOT NULL DEFAULT 0,
  supplier_name text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT fk_project_estimate_materials_record_workspace_project
    FOREIGN KEY (estimate_record_id, workspace_owner_id, project_id)
    REFERENCES public.project_estimate_records(id, workspace_owner_id, project_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_project_estimate_materials_section_workspace_project_record
    FOREIGN KEY (section_id, workspace_owner_id, project_id, estimate_record_id)
    REFERENCES public.project_estimate_sections(id, workspace_owner_id, project_id, estimate_record_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_project_estimate_materials_work_workspace_project_record_section
    FOREIGN KEY (work_id, workspace_owner_id, project_id, estimate_record_id, section_id)
    REFERENCES public.project_estimate_works(id, workspace_owner_id, project_id, estimate_record_id, section_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_project_estimate_materials_directory_material_workspace
    FOREIGN KEY (directory_material_id, workspace_owner_id)
    REFERENCES public.directory_materials(id, workspace_owner_id)
    ON DELETE RESTRICT,
  CONSTRAINT chk_project_estimate_materials_number_not_empty CHECK (btrim(number) <> ''),
  CONSTRAINT chk_project_estimate_materials_title_not_empty CHECK (btrim(title) <> ''),
  CONSTRAINT chk_project_estimate_materials_unit_code_not_empty CHECK (btrim(unit_code) <> ''),
  CONSTRAINT chk_project_estimate_materials_unit_label_not_empty CHECK (btrim(unit_label) <> ''),
  CONSTRAINT chk_project_estimate_materials_quantity_non_negative CHECK (quantity >= 0),
  CONSTRAINT chk_project_estimate_materials_consumption_positive CHECK (
    consumption IS NULL OR consumption > 0
  ),
  CONSTRAINT chk_project_estimate_materials_price_non_negative CHECK (price >= 0),
  CONSTRAINT chk_project_estimate_materials_total_non_negative CHECK (total_amount >= 0),
  CONSTRAINT chk_project_estimate_materials_directory_version_positive CHECK (
    directory_material_version IS NULL OR directory_material_version > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_project_estimate_sections_record_active
  ON public.project_estimate_sections(workspace_owner_id, project_id, estimate_record_id, archived_at, deleted_at, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_project_estimate_works_section_active
  ON public.project_estimate_works(workspace_owner_id, project_id, estimate_record_id, section_id, archived_at, deleted_at, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_project_estimate_works_directory_work
  ON public.project_estimate_works(workspace_owner_id, directory_work_id)
  WHERE directory_work_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_estimate_materials_work_active
  ON public.project_estimate_materials(workspace_owner_id, project_id, estimate_record_id, section_id, work_id, archived_at, deleted_at, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_project_estimate_materials_section_active
  ON public.project_estimate_materials(workspace_owner_id, project_id, estimate_record_id, section_id, archived_at, deleted_at, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_project_estimate_materials_directory_material
  ON public.project_estimate_materials(workspace_owner_id, directory_material_id)
  WHERE directory_material_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.project_estimate_work_set_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.total_amount = round((NEW.quantity * NEW.price)::numeric, 2);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.project_estimate_material_set_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.total_amount = round((NEW.quantity * NEW.price)::numeric, 2);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.recalculate_project_estimate_record_amount(p_estimate_record_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.project_estimate_records record
  SET amount = COALESCE((
    SELECT sum(section.total_amount)
    FROM public.project_estimate_sections section
    WHERE section.estimate_record_id = p_estimate_record_id
      AND section.archived_at IS NULL
      AND section.deleted_at IS NULL
  ), 0),
  updated_at = now()
  WHERE record.id = p_estimate_record_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.recalculate_project_estimate_section_totals(p_section_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  target_estimate_record_id uuid;
BEGIN
  UPDATE public.project_estimate_sections section
  SET works_amount = COALESCE((
        SELECT sum(work.total_amount)
        FROM public.project_estimate_works work
        WHERE work.section_id = p_section_id
          AND work.archived_at IS NULL
          AND work.deleted_at IS NULL
      ), 0),
      materials_amount = COALESCE((
        SELECT sum(material.total_amount)
        FROM public.project_estimate_materials material
        WHERE material.section_id = p_section_id
          AND material.archived_at IS NULL
          AND material.deleted_at IS NULL
      ), 0),
      total_amount = COALESCE((
        SELECT sum(work.total_amount)
        FROM public.project_estimate_works work
        WHERE work.section_id = p_section_id
          AND work.archived_at IS NULL
          AND work.deleted_at IS NULL
      ), 0) + COALESCE((
        SELECT sum(material.total_amount)
        FROM public.project_estimate_materials material
        WHERE material.section_id = p_section_id
          AND material.archived_at IS NULL
          AND material.deleted_at IS NULL
      ), 0),
      updated_at = now()
  WHERE section.id = p_section_id
  RETURNING section.estimate_record_id INTO target_estimate_record_id;

  IF target_estimate_record_id IS NOT NULL THEN
    PERFORM private.recalculate_project_estimate_record_amount(target_estimate_record_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.project_estimate_section_after_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM private.recalculate_project_estimate_record_amount(OLD.estimate_record_id);
    RETURN OLD;
  END IF;

  PERFORM private.recalculate_project_estimate_record_amount(NEW.estimate_record_id);

  IF TG_OP = 'UPDATE' AND OLD.estimate_record_id <> NEW.estimate_record_id THEN
    PERFORM private.recalculate_project_estimate_record_amount(OLD.estimate_record_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.project_estimate_work_after_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM private.recalculate_project_estimate_section_totals(OLD.section_id);
    RETURN OLD;
  END IF;

  PERFORM private.recalculate_project_estimate_section_totals(NEW.section_id);

  IF TG_OP = 'UPDATE' AND OLD.section_id <> NEW.section_id THEN
    PERFORM private.recalculate_project_estimate_section_totals(OLD.section_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.project_estimate_material_after_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM private.recalculate_project_estimate_section_totals(OLD.section_id);
    RETURN OLD;
  END IF;

  PERFORM private.recalculate_project_estimate_section_totals(NEW.section_id);

  IF TG_OP = 'UPDATE' AND OLD.section_id <> NEW.section_id THEN
    PERFORM private.recalculate_project_estimate_section_totals(OLD.section_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_estimate_sections_updated_at ON public.project_estimate_sections;
CREATE TRIGGER trg_project_estimate_sections_updated_at
  BEFORE UPDATE ON public.project_estimate_sections
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS trg_project_estimate_sections_after_change ON public.project_estimate_sections;
CREATE TRIGGER trg_project_estimate_sections_after_change
  AFTER INSERT OR UPDATE OR DELETE ON public.project_estimate_sections
  FOR EACH ROW
  EXECUTE FUNCTION private.project_estimate_section_after_change();

DROP TRIGGER IF EXISTS trg_project_estimate_works_set_total ON public.project_estimate_works;
CREATE TRIGGER trg_project_estimate_works_set_total
  BEFORE INSERT OR UPDATE OF quantity, price ON public.project_estimate_works
  FOR EACH ROW
  EXECUTE FUNCTION private.project_estimate_work_set_total();

DROP TRIGGER IF EXISTS trg_project_estimate_works_updated_at ON public.project_estimate_works;
CREATE TRIGGER trg_project_estimate_works_updated_at
  BEFORE UPDATE ON public.project_estimate_works
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS trg_project_estimate_works_after_change ON public.project_estimate_works;
CREATE TRIGGER trg_project_estimate_works_after_change
  AFTER INSERT OR UPDATE OR DELETE ON public.project_estimate_works
  FOR EACH ROW
  EXECUTE FUNCTION private.project_estimate_work_after_change();

DROP TRIGGER IF EXISTS trg_project_estimate_materials_set_total ON public.project_estimate_materials;
CREATE TRIGGER trg_project_estimate_materials_set_total
  BEFORE INSERT OR UPDATE OF quantity, price ON public.project_estimate_materials
  FOR EACH ROW
  EXECUTE FUNCTION private.project_estimate_material_set_total();

DROP TRIGGER IF EXISTS trg_project_estimate_materials_updated_at ON public.project_estimate_materials;
CREATE TRIGGER trg_project_estimate_materials_updated_at
  BEFORE UPDATE ON public.project_estimate_materials
  FOR EACH ROW
  EXECUTE FUNCTION private.set_updated_at();

DROP TRIGGER IF EXISTS trg_project_estimate_materials_after_change ON public.project_estimate_materials;
CREATE TRIGGER trg_project_estimate_materials_after_change
  AFTER INSERT OR UPDATE OR DELETE ON public.project_estimate_materials
  FOR EACH ROW
  EXECUTE FUNCTION private.project_estimate_material_after_change();

ALTER TABLE public.project_estimate_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_estimate_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_estimate_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_estimate_sections_select" ON public.project_estimate_sections;
CREATE POLICY "project_estimate_sections_select" ON public.project_estimate_sections
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_sections_insert" ON public.project_estimate_sections;
CREATE POLICY "project_estimate_sections_insert" ON public.project_estimate_sections
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_sections_update" ON public.project_estimate_sections;
CREATE POLICY "project_estimate_sections_update" ON public.project_estimate_sections
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_sections_delete" ON public.project_estimate_sections;
CREATE POLICY "project_estimate_sections_delete" ON public.project_estimate_sections
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_works_select" ON public.project_estimate_works;
CREATE POLICY "project_estimate_works_select" ON public.project_estimate_works
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_works_insert" ON public.project_estimate_works;
CREATE POLICY "project_estimate_works_insert" ON public.project_estimate_works
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_works_update" ON public.project_estimate_works;
CREATE POLICY "project_estimate_works_update" ON public.project_estimate_works
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_works_delete" ON public.project_estimate_works;
CREATE POLICY "project_estimate_works_delete" ON public.project_estimate_works
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_materials_select" ON public.project_estimate_materials;
CREATE POLICY "project_estimate_materials_select" ON public.project_estimate_materials
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_materials_insert" ON public.project_estimate_materials;
CREATE POLICY "project_estimate_materials_insert" ON public.project_estimate_materials
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_materials_update" ON public.project_estimate_materials;
CREATE POLICY "project_estimate_materials_update" ON public.project_estimate_materials
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_materials_delete" ON public.project_estimate_materials;
CREATE POLICY "project_estimate_materials_delete" ON public.project_estimate_materials
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_estimate_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_estimate_works TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_estimate_materials TO authenticated;

REVOKE EXECUTE ON FUNCTION private.project_estimate_work_set_total() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.project_estimate_material_set_total() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.recalculate_project_estimate_record_amount(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.recalculate_project_estimate_section_totals(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.project_estimate_section_after_change() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.project_estimate_work_after_change() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.project_estimate_material_after_change() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.project_estimate_work_set_total() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.project_estimate_material_set_total() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.recalculate_project_estimate_record_amount(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.recalculate_project_estimate_section_totals(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.project_estimate_section_after_change() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.project_estimate_work_after_change() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.project_estimate_material_after_change() TO authenticated, service_role;

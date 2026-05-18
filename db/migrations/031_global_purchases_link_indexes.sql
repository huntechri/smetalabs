CREATE INDEX IF NOT EXISTS idx_global_purchases_project_id
  ON public.global_purchases(project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_global_purchases_created_by
  ON public.global_purchases(created_by);

CREATE INDEX IF NOT EXISTS idx_global_purchases_updated_by
  ON public.global_purchases(updated_by)
  WHERE updated_by IS NOT NULL;

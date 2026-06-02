CREATE TABLE "directory_work_usage_stats" (
	"workspace_owner_id" uuid NOT NULL,
	"work_id" uuid NOT NULL,
	"use_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "directory_work_usage_stats_workspace_owner_id_work_id_pk" PRIMARY KEY("workspace_owner_id","work_id"),
	CONSTRAINT "chk_directory_work_usage_stats_use_count_non_negative" CHECK ("directory_work_usage_stats"."use_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "directory_material_usage_stats" (
	"workspace_owner_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"use_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "directory_material_usage_stats_workspace_owner_id_material_id_pk" PRIMARY KEY("workspace_owner_id","material_id"),
	CONSTRAINT "chk_directory_material_usage_stats_use_count_non_negative" CHECK ("directory_material_usage_stats"."use_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "project_estimate_payments" ALTER COLUMN "section_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "directory_work_usage_stats" ADD CONSTRAINT "directory_work_usage_stats_workspace_owner_id_profiles_id_fk" FOREIGN KEY ("workspace_owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directory_work_usage_stats" ADD CONSTRAINT "fk_directory_work_usage_stats_work_workspace" FOREIGN KEY ("work_id","workspace_owner_id") REFERENCES "public"."directory_works"("id","workspace_owner_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "directory_material_usage_stats" ADD CONSTRAINT "directory_material_usage_stats_workspace_owner_id_profiles_id_fk" FOREIGN KEY ("workspace_owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directory_material_usage_stats" ADD CONSTRAINT "fk_directory_material_usage_stats_material_workspace" FOREIGN KEY ("material_id","workspace_owner_id") REFERENCES "public"."directory_materials"("id","workspace_owner_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "idx_directory_work_usage_stats_workspace_use_count" ON "directory_work_usage_stats" USING btree ("workspace_owner_id","use_count");--> statement-breakpoint
CREATE INDEX "idx_directory_material_usage_stats_workspace_use_count" ON "directory_material_usage_stats" USING btree ("workspace_owner_id","use_count");--> statement-breakpoint

ALTER TABLE "directory_work_usage_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "directory_material_usage_stats" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "directory_work_usage_stats_select" ON "directory_work_usage_stats"
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));--> statement-breakpoint

CREATE POLICY "directory_material_usage_stats_select" ON "directory_material_usage_stats"
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));--> statement-breakpoint

GRANT SELECT ON "directory_work_usage_stats" TO authenticated, service_role;--> statement-breakpoint
GRANT SELECT ON "directory_material_usage_stats" TO authenticated, service_role;--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.directory_work_usage_stats_after_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.directory_work_id IS NOT NULL THEN
      INSERT INTO public.directory_work_usage_stats (workspace_owner_id, work_id, use_count, updated_at)
      VALUES (NEW.workspace_owner_id, NEW.directory_work_id, 1, now())
      ON CONFLICT (workspace_owner_id, work_id)
      DO UPDATE SET use_count = public.directory_work_usage_stats.use_count + 1, updated_at = now();
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.directory_work_id IS NOT NULL THEN
      UPDATE public.directory_work_usage_stats
      SET use_count = GREATEST(0, use_count - 1), updated_at = now()
      WHERE workspace_owner_id = OLD.workspace_owner_id AND work_id = OLD.directory_work_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.directory_work_id, '00000000-0000-0000-0000-000000000000'::uuid) <> COALESCE(NEW.directory_work_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      IF OLD.directory_work_id IS NOT NULL THEN
        UPDATE public.directory_work_usage_stats
        SET use_count = GREATEST(0, use_count - 1), updated_at = now()
        WHERE workspace_owner_id = OLD.workspace_owner_id AND work_id = OLD.directory_work_id;
      END IF;
      IF NEW.directory_work_id IS NOT NULL THEN
        INSERT INTO public.directory_work_usage_stats (workspace_owner_id, work_id, use_count, updated_at)
        VALUES (NEW.workspace_owner_id, NEW.directory_work_id, 1, now())
        ON CONFLICT (workspace_owner_id, work_id)
        DO UPDATE SET use_count = public.directory_work_usage_stats.use_count + 1, updated_at = now();
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION private.directory_work_usage_stats_after_change() FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.directory_work_usage_stats_after_change() TO authenticated, service_role;--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_project_estimate_works_usage_stats ON public.project_estimate_works;--> statement-breakpoint
CREATE TRIGGER trg_project_estimate_works_usage_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.project_estimate_works
  FOR EACH ROW
  EXECUTE FUNCTION private.directory_work_usage_stats_after_change();--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.directory_material_usage_stats_after_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.directory_material_id IS NOT NULL THEN
      INSERT INTO public.directory_material_usage_stats (workspace_owner_id, material_id, use_count, updated_at)
      VALUES (NEW.workspace_owner_id, NEW.directory_material_id, 1, now())
      ON CONFLICT (workspace_owner_id, material_id)
      DO UPDATE SET use_count = public.directory_material_usage_stats.use_count + 1, updated_at = now();
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.directory_material_id IS NOT NULL THEN
      UPDATE public.directory_material_usage_stats
      SET use_count = GREATEST(0, use_count - 1), updated_at = now()
      WHERE workspace_owner_id = OLD.workspace_owner_id AND material_id = OLD.directory_material_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.directory_material_id, '00000000-0000-0000-0000-000000000000'::uuid) <> COALESCE(NEW.directory_material_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      IF OLD.directory_material_id IS NOT NULL THEN
        UPDATE public.directory_material_usage_stats
        SET use_count = GREATEST(0, use_count - 1), updated_at = now()
        WHERE workspace_owner_id = OLD.workspace_owner_id AND material_id = OLD.directory_material_id;
      END IF;
      IF NEW.directory_material_id IS NOT NULL THEN
        INSERT INTO public.directory_material_usage_stats (workspace_owner_id, material_id, use_count, updated_at)
        VALUES (NEW.workspace_owner_id, NEW.directory_material_id, 1, now())
        ON CONFLICT (workspace_owner_id, material_id)
        DO UPDATE SET use_count = public.directory_material_usage_stats.use_count + 1, updated_at = now();
      END IF;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION private.directory_material_usage_stats_after_change() FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.directory_material_usage_stats_after_change() TO authenticated, service_role;--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_project_estimate_materials_usage_stats ON public.project_estimate_materials;--> statement-breakpoint
CREATE TRIGGER trg_project_estimate_materials_usage_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.project_estimate_materials
  FOR EACH ROW
  EXECUTE FUNCTION private.directory_material_usage_stats_after_change();
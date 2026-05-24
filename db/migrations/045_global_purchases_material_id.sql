-- 045: Add directory_material_id to global_purchases for estimate purchases tab
-- Links purchase records to the material directory for plan-fact analysis

-- 1. Add nullable column
ALTER TABLE "global_purchases"
  ADD COLUMN "directory_material_id" uuid;

-- 2. Add foreign key (ON DELETE SET NULL — keep purchase records even if material is removed)
ALTER TABLE "global_purchases"
  ADD CONSTRAINT "global_purchases_directory_material_id_directory_materials_id_fk"
  FOREIGN KEY ("directory_material_id")
  REFERENCES "public"."directory_materials"("id")
  ON DELETE SET NULL
  ON UPDATE NO ACTION;

-- 3. Add index for plan-fact lookups
CREATE INDEX "idx_global_purchases_material"
  ON "global_purchases"
  USING btree ("directory_material_id", "workspace_owner_id")
  WHERE "global_purchases"."directory_material_id" IS NOT NULL;

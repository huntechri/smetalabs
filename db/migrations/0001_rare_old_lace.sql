CREATE TABLE IF NOT EXISTS "project_estimate_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_owner_id" uuid NOT NULL REFERENCES "public"."profiles"("id") ON DELETE cascade,
	"estimate_record_id" uuid NOT NULL REFERENCES "public"."project_estimate_records"("id") ON DELETE cascade,
	"section_id" uuid NOT NULL REFERENCES "public"."project_estimate_sections"("id") ON DELETE cascade,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"date" text NOT NULL,
	"status" text DEFAULT 'expected' NOT NULL,
	"purpose" text DEFAULT '' NOT NULL,
	"created_by" uuid REFERENCES "public"."profiles"("id") ON DELETE set null,
	"updated_by" uuid REFERENCES "public"."profiles"("id") ON DELETE set null,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_pepay_amount_non_negative" CHECK ("amount" >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_pepay_estimate" ON "project_estimate_payments" USING btree ("estimate_record_id","workspace_owner_id");
CREATE INDEX IF NOT EXISTS "idx_pepay_section" ON "project_estimate_payments" USING btree ("section_id");

-- RLS
ALTER TABLE public.project_estimate_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_estimate_payments_select" ON public.project_estimate_payments;
CREATE POLICY "project_estimate_payments_select" ON public.project_estimate_payments
  FOR SELECT USING (private.workspace_can_read(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_payments_insert" ON public.project_estimate_payments;
CREATE POLICY "project_estimate_payments_insert" ON public.project_estimate_payments
  FOR INSERT WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_payments_update" ON public.project_estimate_payments;
CREATE POLICY "project_estimate_payments_update" ON public.project_estimate_payments
  FOR UPDATE USING (private.workspace_can_write_directory(workspace_owner_id))
  WITH CHECK (private.workspace_can_write_directory(workspace_owner_id));

DROP POLICY IF EXISTS "project_estimate_payments_delete" ON public.project_estimate_payments;
CREATE POLICY "project_estimate_payments_delete" ON public.project_estimate_payments
  FOR DELETE USING (private.workspace_can_write_directory(workspace_owner_id));

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_estimate_payments TO authenticated;
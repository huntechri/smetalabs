alter table public.directory_work_import_rows
  add column if not exists batch_number integer;

alter table public.directory_material_import_rows
  add column if not exists batch_number integer;

create index if not exists idx_directory_work_import_rows_workspace_job_batch
  on public.directory_work_import_rows (workspace_owner_id, job_id, batch_number);

create index if not exists idx_directory_material_import_rows_workspace_job_batch
  on public.directory_material_import_rows (workspace_owner_id, job_id, batch_number);

alter table public.directory_work_import_rows
  drop constraint if exists chk_directory_work_import_rows_batch_number_positive;

alter table public.directory_work_import_rows
  add constraint chk_directory_work_import_rows_batch_number_positive
  check (batch_number is null or batch_number > 0);

alter table public.directory_material_import_rows
  drop constraint if exists chk_directory_material_import_rows_batch_number_positive;

alter table public.directory_material_import_rows
  add constraint chk_directory_material_import_rows_batch_number_positive
  check (batch_number is null or batch_number > 0);

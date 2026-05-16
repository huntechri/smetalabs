alter table public.directory_materials
  add column if not exists aliases text[] not null default '{}'::text[],
  add column if not exists keywords text[] not null default '{}'::text[];

create index if not exists idx_directory_materials_workspace_aliases
  on public.directory_materials using gin (aliases);

create index if not exists idx_directory_materials_workspace_keywords
  on public.directory_materials using gin (keywords);

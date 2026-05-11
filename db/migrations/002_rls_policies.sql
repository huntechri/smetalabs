-- ============================================================================
-- Миграция: 002_rls_policies.sql
-- Описание: Row Level Security — вспомогательные функции + политики
-- Дата: 2026-05-11
-- ============================================================================

-- ── 1. Включение RLS на всех таблицах ──
-- (RLS уже включён на существующих таблицах, но включаем явно для всех)

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- Будущие таблицы (когда будут созданы):
-- ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.estimate_works ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.estimate_materials ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.global_purchases ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.directory_materials ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.directory_works ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.directory_suppliers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.directory_counterparties ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.template_works ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.template_materials ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.workspace_allowed_domains ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- ── 2. Вспомогательные функции ──

-- Проверка наличия конкретной роли у текущего пользователя
CREATE OR REPLACE FUNCTION public.user_role(role_name text)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = role_name
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Семантические проверки ролей
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean AS $$ SELECT public.user_role('owner'); $$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$ SELECT public.user_role('admin'); $$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean AS $$ SELECT public.user_role('manager'); $$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_estimator()
RETURNS boolean AS $$ SELECT public.user_role('estimator'); $$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION public.is_viewer()
RETURNS boolean AS $$ SELECT public.user_role('viewer'); $$ LANGUAGE sql;

-- Проверка прав на запись (owner, admin, manager)
CREATE OR REPLACE FUNCTION public.can_write()
RETURNS boolean AS $$
  SELECT public.is_owner() OR public.is_admin() OR public.is_manager();
$$ LANGUAGE sql;

-- Проверка прав на чтение (все роли, включая viewer)
CREATE OR REPLACE FUNCTION public.can_read()
RETURNS boolean AS $$
  SELECT public.is_owner() OR public.is_admin() OR public.is_manager()
      OR public.is_estimator() OR public.is_viewer();
$$ LANGUAGE sql;

-- ── 3. Политики для существующих таблиц ──

-- 3.1 profiles — пользователь видит и редактирует только свой профиль
DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
CREATE POLICY "users_read_own_profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "admin_read_all_profiles" ON public.profiles;
CREATE POLICY "admin_read_all_profiles" ON public.profiles
  FOR SELECT USING (public.can_read());

-- 3.2 roles — все аутентифицированные могут читать, только owner/admin могут писать
DROP POLICY IF EXISTS "authenticated_read_roles" ON public.roles;
CREATE POLICY "authenticated_read_roles" ON public.roles
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "can_write_insert_roles" ON public.roles;
CREATE POLICY "can_write_insert_roles" ON public.roles
  FOR INSERT WITH CHECK (public.can_write());

DROP POLICY IF EXISTS "can_write_update_roles" ON public.roles;
CREATE POLICY "can_write_update_roles" ON public.roles
  FOR UPDATE USING (public.can_write());

DROP POLICY IF EXISTS "can_write_delete_roles" ON public.roles;
CREATE POLICY "can_write_delete_roles" ON public.roles
  FOR DELETE USING (public.can_write());

-- 3.3 permissions — все аутентифицированные могут читать
DROP POLICY IF EXISTS "authenticated_read_permissions" ON public.permissions;
CREATE POLICY "authenticated_read_permissions" ON public.permissions
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "can_write_insert_permissions" ON public.permissions;
CREATE POLICY "can_write_insert_permissions" ON public.permissions
  FOR INSERT WITH CHECK (public.can_write());

DROP POLICY IF EXISTS "can_write_update_permissions" ON public.permissions;
CREATE POLICY "can_write_update_permissions" ON public.permissions
  FOR UPDATE USING (public.can_write());

DROP POLICY IF EXISTS "can_write_delete_permissions" ON public.permissions;
CREATE POLICY "can_write_delete_permissions" ON public.permissions
  FOR DELETE USING (public.can_write());

-- 3.4 role_permissions — чтение всем, запись owner/admin
DROP POLICY IF EXISTS "authenticated_read_role_permissions" ON public.role_permissions;
CREATE POLICY "authenticated_read_role_permissions" ON public.role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "can_write_insert_role_permissions" ON public.role_permissions;
CREATE POLICY "can_write_insert_role_permissions" ON public.role_permissions
  FOR INSERT WITH CHECK (public.can_write());

DROP POLICY IF EXISTS "can_write_delete_role_permissions" ON public.role_permissions;
CREATE POLICY "can_write_delete_role_permissions" ON public.role_permissions
  FOR DELETE USING (public.can_write());

-- 3.5 user_roles — пользователь видит свои роли, owner/admin видят все
DROP POLICY IF EXISTS "users_read_own_roles" ON public.user_roles;
CREATE POLICY "users_read_own_roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_read_all_user_roles" ON public.user_roles;
CREATE POLICY "admin_read_all_user_roles" ON public.user_roles
  FOR SELECT USING (public.is_owner() OR public.is_admin());

DROP POLICY IF EXISTS "can_write_insert_user_roles" ON public.user_roles;
CREATE POLICY "can_write_insert_user_roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.is_owner() OR public.is_admin());

DROP POLICY IF EXISTS "can_write_delete_user_roles" ON public.user_roles;
CREATE POLICY "can_write_delete_user_roles" ON public.user_roles
  FOR DELETE USING (public.is_owner() OR public.is_admin());

-- ── 4. Политики для будущих таблиц (шаблоны) ──

/*
-- Пример: projects
CREATE POLICY "owner_or_can_write" ON public.projects
  FOR ALL USING (
    auth.uid() = owner_id
    OR public.can_write()
  );

CREATE POLICY "authenticated_can_read" ON public.projects
  FOR SELECT USING (
    auth.uid() = owner_id
    OR public.can_read()
  );

-- Пример: directory_materials — все могут читать, owner/admin/manager пишут
CREATE POLICY "authenticated_can_read" ON public.directory_materials
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "can_write_insert" ON public.directory_materials
  FOR INSERT WITH CHECK (public.can_write());

CREATE POLICY "can_write_update" ON public.directory_materials
  FOR UPDATE USING (public.can_write());

CREATE POLICY "can_write_delete" ON public.directory_materials
  FOR DELETE USING (public.can_write());
*/

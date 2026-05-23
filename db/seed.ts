import "dotenv/config"
import { supabase } from "./index"

// ── Seed data (mirrors features/access-control/__mocks__/permissions.ts) ──

interface RoleDef {
  id: string
  label: string
  locked: boolean
}

interface PermDef {
  key: string
  label: string
  group: string
}

const accessRoles: RoleDef[] = [
  { id: "owner", label: "Владелец", locked: true },
  { id: "admin", label: "Администратор", locked: false },
  { id: "manager", label: "Менеджер", locked: false },
  { id: "estimator", label: "Сметчик", locked: false },
  { id: "viewer", label: "Наблюдатель", locked: false },
]

const permissionDefs: PermDef[] = [
  { key: "projects.read", label: "Просмотр проектов", group: "projects" },
  { key: "projects.create", label: "Создание проектов", group: "projects" },
  {
    key: "projects.update",
    label: "Редактирование проектов",
    group: "projects",
  },
  { key: "projects.delete", label: "Удаление проектов", group: "projects" },
  { key: "estimates.read", label: "Просмотр смет", group: "estimates" },
  { key: "estimates.create", label: "Создание смет", group: "estimates" },
  { key: "estimates.update", label: "Редактирование смет", group: "estimates" },
  { key: "estimates.delete", label: "Удаление смет", group: "estimates" },
  { key: "purchases.read", label: "Просмотр закупок", group: "purchases" },
  { key: "purchases.create", label: "Создание закупок", group: "purchases" },
  {
    key: "purchases.update",
    label: "Редактирование закупок",
    group: "purchases",
  },
  { key: "purchases.delete", label: "Удаление закупок", group: "purchases" },
  { key: "team.read", label: "Просмотр команды", group: "team" },
  { key: "team.create", label: "Приглашение участников", group: "team" },
  { key: "team.update", label: "Редактирование ролей", group: "team" },
  { key: "team.delete", label: "Удаление участников", group: "team" },
  { key: "team.manage", label: "Управление командой", group: "team" },
  { key: "billing.read", label: "Просмотр биллинга", group: "billing" },
  { key: "billing.manage", label: "Управление биллингом", group: "billing" },
]

const permissionMatrix: Record<string, string[]> = {
  owner: permissionDefs.map((p) => p.key),
  admin: permissionDefs
    .filter((p) => p.key !== "billing.manage")
    .map((p) => p.key),
  manager: permissionDefs
    .filter(
      (p) =>
        p.group === "projects" ||
        p.group === "estimates" ||
        p.group === "purchases" ||
        p.key === "team.read"
    )
    .map((p) => p.key),
  estimator: permissionDefs
    .filter(
      (p) =>
        p.key === "projects.read" ||
        p.group === "estimates" ||
        p.key === "purchases.read"
    )
    .map((p) => p.key),
  viewer: permissionDefs
    .filter((p) => p.key.endsWith(".read"))
    .map((p) => p.key),
}

async function seed() {
  console.log("🌱 Seeding RBAC...")

  // ── 1. Seed roles ──
  const roleMap = new Map<string, string>()
  for (const role of accessRoles) {
    const { data: existing } = await supabase
      .from("roles")
      .select("id")
      .eq("name", role.id)

    if (existing && existing.length > 0) {
      roleMap.set(role.id, existing[0].id)
      console.log(`  ⏭  Role "${role.label}" already exists`)
    } else {
      const { data: inserted, error } = await supabase
        .from("roles")
        .insert({ name: role.id, label: role.label, locked: role.locked })
        .select("id")

      if (error) {
        console.error(`  ❌ Failed to insert role "${role.label}":`, error)
        process.exit(1)
      }

      roleMap.set(role.id, inserted![0].id)
      console.log(`  ✅ Role "${role.label}" created`)
    }
  }

  // ── 2. Seed permissions ──
  const permMap = new Map<string, string>()
  for (const perm of permissionDefs) {
    const { data: existing } = await supabase
      .from("permissions")
      .select("id")
      .eq("key", perm.key)

    if (existing && existing.length > 0) {
      permMap.set(perm.key, existing[0].id)
    } else {
      const { data: inserted, error } = await supabase
        .from("permissions")
        .insert({ key: perm.key, label: perm.label, group_name: perm.group })
        .select("id")

      if (error) {
        console.error(`  ❌ Failed to insert permission "${perm.key}":`, error)
        process.exit(1)
      }

      permMap.set(perm.key, inserted![0].id)
    }
  }
  console.log(`  ✅ ${permMap.size} permissions ensured`)

  // ── 3. Seed role_permissions ──
  let linksCreated = 0
  for (const [roleName, permKeys] of Object.entries(permissionMatrix)) {
    const roleId = roleMap.get(roleName)!
    for (const permKey of permKeys) {
      const permId = permMap.get(permKey)!

      const { data: existing } = await supabase
        .from("role_permissions")
        .select("role_id")
        .eq("role_id", roleId)
        .eq("permission_id", permId)

      if (!existing || existing.length === 0) {
        const { error } = await supabase
          .from("role_permissions")
          .insert({ role_id: roleId, permission_id: permId })

        if (error) {
          console.error(
            `  ❌ Failed to link role "${roleName}" ↔ "${permKey}":`,
            error
          )
          process.exit(1)
        }

        linksCreated++
      }
    }
  }
  console.log(`  ✅ ${linksCreated} role_permission links created`)

  console.log("🌱 Seed complete!")
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})

import "dotenv/config"
import { supabase } from "./index"

/**
 * Дефолтные настройки (соответствуют документации 2.2.17).
 */
const defaultSettings = {
  profile: {
    language: "ru",
    timezone: "UTC",
  },
  workspace: {
    companyLegalName: "",
    companyType: "",
    registrationNumber: "",
    taxNumber: "",
    legalAddress: "",
    billingEmail: "",
    companyPhone: "",
    defaultCurrency: "RUB",
    defaultLocale: "ru-RU",
    defaultTimezone: "UTC",
  },
  preferences: {
    theme: "system",
    density: "comfortable",
    dateFormat: "DD.MM.YYYY",
    numberFormat: "ru-RU",
    defaultEstimateView: "table",
  },
  notifications: {
    projectUpdates: true,
    estimateUpdates: true,
    procurementUpdates: true,
    teamInvitations: true,
    billingNotifications: true,
    weeklySummary: false,
  },
  security: {
    twoFactorEnabled: false,
    lastLogin: "",
    activeSessionsCount: 0,
  },
}

async function seed() {
  console.log("🌱 Seeding user_settings + workspace...")

  // Получаем все профили
  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("id")

  if (profilesErr) {
    console.error("  ❌ Failed to fetch profiles:", profilesErr)
    process.exit(1)
  }

  if (!profiles || profiles.length === 0) {
    console.log("  ⚠️  No profiles found — skipping settings seed")
    process.exit(0)
  }

  console.log(`  📋 Found ${profiles.length} profile(s)`)

  // ── Seed user_settings ──
  let created = 0
  let skipped = 0

  for (const profile of profiles) {
    // Проверяем, есть ли уже настройки
    const { data: existing } = await supabase
      .from("user_settings")
      .select("user_id")
      .eq("user_id", profile.id)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    // Вставляем дефолтные настройки
    const { error: insertErr } = await supabase
      .from("user_settings")
      .insert({
        user_id: profile.id,
        ...defaultSettings,
      })

    if (insertErr) {
      console.error(`  ❌ Failed to seed settings for user ${profile.id}:`, insertErr)
      process.exit(1)
    }

    created++
  }

  console.log(`  ✅ ${created} settings row(s) created, ${skipped} skipped (already exist)`)

  // ════════════════════════════════════════════════════════
  // Seed workspace_members
  // ════════════════════════════════════════════════════════
  console.log("")
  console.log("🌱 Seeding workspace_members...")

  const { data: allProfiles, error: allProfilesErr } = await supabase
    .from("profiles")
    .select("id, full_name, workspace_name")
    .order("created_at", { ascending: true })

  if (allProfilesErr) {
    console.error("  ❌ Failed to fetch all profiles:", allProfilesErr)
    process.exit(1)
  }

  if (!allProfiles || allProfiles.length === 0) {
    console.log("  ⚠️  No profiles found — skipping workspace seed")
    console.log("🌱 Seed complete!")
    process.exit(0)
  }

  // Get roles
  const { data: allRoles, error: rolesErr } = await supabase
    .from("roles")
    .select("id, name")

  if (rolesErr || !allRoles) {
    console.error("  ❌ Failed to fetch roles:", rolesErr)
    process.exit(1)
  }

  const roleByName = new Map(allRoles.map((r: any) => [r.name, r.id]))
  const ownerRoleId = roleByName.get("owner")
  const adminRoleId = roleByName.get("admin")
  const estimatorRoleId = roleByName.get("estimator")
  const viewerRoleId = roleByName.get("viewer")

  if (!ownerRoleId) {
    console.error("  ❌ Owner role not found — run main seed first")
    process.exit(1)
  }

  // First user = workspace owner
  const workspaceOwner = allProfiles[0]
  const ownerId = workspaceOwner.id

  console.log(`  📋 Workspace owner: ${workspaceOwner.full_name ?? workspaceOwner.id} (${ownerId})`)

  // Role assignments for remaining users (index-based)
  const memberRoles = [
    { roleId: adminRoleId, roleName: "admin" },
    { roleId: estimatorRoleId, roleName: "estimator" },
    { roleId: viewerRoleId, roleName: "viewer" },
  ]

  let membersCreated = 0
  let membersSkipped = 0

  for (let i = 0; i < allProfiles.length; i++) {
    const profile = allProfiles[i]

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("user_id", profile.id)
      .eq("owner_id", ownerId)
      .maybeSingle()

    if (existingMember) {
      membersSkipped++
      continue
    }

    if (i === 0) {
      // First user = owner (user_id == owner_id)
      const { error: insertErr } = await supabase
        .from("workspace_members")
        .insert({
          user_id: profile.id,
          owner_id: ownerId,
          role_id: ownerRoleId,
          status: "active",
          joined_at: new Date().toISOString(),
        })

      if (insertErr) {
        console.error(`  ❌ Failed to seed owner workspace_member:`, insertErr)
        process.exit(1)
      }

      membersCreated++
      console.log(`  ✅ Owner ${profile.full_name ?? profile.id} added as workspace_member (owner)`)
    } else {
      // Other users: assign roles from memberRoles array (round-robin via modulo)
      const roleIdx = (i - 1) % memberRoles.length
      const assignedRole = memberRoles[roleIdx]

      const { error: insertErr } = await supabase
        .from("workspace_members")
        .insert({
          user_id: profile.id,
          owner_id: ownerId,
          role_id: assignedRole.roleId,
          status: "active",
          joined_at: new Date().toISOString(),
        })

      if (insertErr) {
        console.error(`  ❌ Failed to seed workspace_member for ${profile.full_name ?? profile.id}:`, insertErr)
        process.exit(1)
      }

      membersCreated++
      console.log(`  ✅ ${profile.full_name ?? profile.id} added as workspace_member (${assignedRole.roleName})`)
    }
  }

  console.log(`  ✅ ${membersCreated} workspace_member(s) created, ${membersSkipped} skipped`)

  // ════════════════════════════════════════════════════════
  // Seed workspace_invitations (2-3 pending)
  // ════════════════════════════════════════════════════════
  console.log("")
  console.log("🌱 Seeding workspace_invitations...")

  const sampleInvitations = [
    {
      email: "new.manager@example.com",
      roleName: "manager",
      message: "Приглашаем Вас в команду в роли Менеджера",
    },
    {
      email: "new.estimator@example.com",
      roleName: "estimator",
      message: null,
    },
    {
      email: "new.viewer@example.com",
      roleName: "viewer",
      message: "Добро пожаловать в SmetaLab! Подтвердите регистрацию.",
    },
  ]

  let invCreated = 0
  let invSkipped = 0

  for (const inv of sampleInvitations) {
    const roleId = roleByName.get(inv.roleName)
    if (!roleId) {
      console.error(`  ❌ Role "${inv.roleName}" not found, skipping invitation`)
      continue
    }

    // Check existing
    const { data: existingInv } = await supabase
      .from("workspace_invitations")
      .select("id")
      .eq("email", inv.email)
      .eq("owner_id", ownerId)
      .eq("status", "pending")
      .maybeSingle()

    if (existingInv) {
      invSkipped++
      continue
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error: insertErr } = await supabase
      .from("workspace_invitations")
      .insert({
        email: inv.email,
        role_id: roleId,
        invited_by: ownerId,
        owner_id: ownerId,
        message: inv.message,
        expires_at: expiresAt,
        status: "pending",
      })

    if (insertErr) {
      console.error(`  ❌ Failed to seed invitation for ${inv.email}:`, insertErr)
      process.exit(1)
    }

    invCreated++
    console.log(`  ✅ Invitation created: ${inv.email} (${inv.roleName})`)
  }

  console.log(`  ✅ ${invCreated} invitation(s) created, ${invSkipped} skipped`)

  // ════════════════════════════════════════════════════════
  // Seed workspace_allowed_domains (1-2 domains)
  // ════════════════════════════════════════════════════════
  console.log("")
  console.log("🌱 Seeding workspace_allowed_domains...")

  const sampleDomains = ["smetalab.ru", "example.com"]

  let domCreated = 0
  let domSkipped = 0

  for (const domain of sampleDomains) {
    // Check existing
    const { data: existingDom } = await supabase
      .from("workspace_allowed_domains")
      .select("id")
      .eq("domain", domain)
      .eq("owner_id", ownerId)
      .maybeSingle()

    if (existingDom) {
      domSkipped++
      continue
    }

    const { error: insertErr } = await supabase
      .from("workspace_allowed_domains")
      .insert({
        domain,
        owner_id: ownerId,
        added_by: ownerId,
      })

    if (insertErr) {
      console.error(`  ❌ Failed to seed domain ${domain}:`, insertErr)
      process.exit(1)
    }

    domCreated++
    console.log(`  ✅ Domain added: ${domain}`)
  }

  console.log(`  ✅ ${domCreated} domain(s) created, ${domSkipped} skipped`)

  console.log("🌱 Seed complete!")
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})

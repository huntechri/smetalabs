import "dotenv/config"
import { supabase } from "./index"

/**
 * Дефолтные настройки (соответствуют документации 2.2.17).
 */
const defaultSettings = {
  profile: {
    displayName: "",
    email: "",
    phone: "",
    jobTitle: "",
    language: "ru",
    timezone: "Europe/Moscow",
  },
  workspace: {
    workspaceName: "",
    companyLegalName: "",
    companyType: "",
    registrationNumber: "",
    taxNumber: "",
    legalAddress: "",
    billingEmail: "",
    companyPhone: "",
    defaultCurrency: "RUB",
    defaultLocale: "ru-RU",
    defaultTimezone: "Europe/Moscow",
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
  console.log("🌱 Seeding user_settings...")

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
  console.log("🌱 Seed complete!")
  process.exit(0)
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})

import { supabase } from "@/db"

export async function updateProfileFields(
  userId: string,
  profileUpdate: Record<string, string>
) {
  if (Object.keys(profileUpdate).length === 0) return

  const { error } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", userId)
  if (error) throw error
}

export async function upsertSettingsColumn(
  userId: string,
  column: string,
  data: Record<string, unknown>
) {
  const { data: existing, error: selectError } = await supabase
    .from("user_settings")
    .select(`user_id, ${column}`)
    .eq("user_id", userId)
    .maybeSingle()

  if (selectError) throw selectError

  const current = ((existing as Record<string, unknown> | null)?.[column] ??
    {}) as Record<string, unknown>
  const merged = { ...current, ...data }

  if (existing) {
    const { error } = await supabase
      .from("user_settings")
      .update({ [column]: merged, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from("user_settings")
    .insert({ user_id: userId, [column]: merged })
  if (error) throw error
}

export async function getProfileSettingsSource(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, phone, position, workspace_name")
    .eq("id", userId)
    .maybeSingle()

  return data
}

export async function getUserSettingsSource(userId: string) {
  const { data, error } = await supabase
    .from("user_settings")
    .select(
      "profile, workspace, preferences, notifications, security, updated_at"
    )
    .eq("user_id", userId)
    .single()

  if (error && error.code !== "PGRST116") throw error

  return data
}

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabase } from "@/db"
import { getPrimaryWorkspace, getWorkspaceRole } from "@/lib/auth/team"

/**
 * GET /api/settings
 *
 * Возвращает настройки текущего пользователя.
 * Формат ответа:
 * {
 *   "data": { profile, workspace, workspaceAccess, preferences, notifications, security },
 *   "meta": { updatedAt }
 * }
 */
export async function GET() {
  // ── Step 1: Auth check (через SSR-клиент с cookies) ──
  let ssrClient
  try {
    ssrClient = await createClient()
  } catch (err) {
    console.error("[GET /api/settings] createClient failed:", err)
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Ошибка при создании клиента",
        },
      },
      { status: 500 }
    )
  }

  let user
  try {
    const result = await ssrClient.auth.getUser()
    user = result.data?.user ?? null
    if (result.error) {
      console.error("[GET /api/settings] getUser returned error:", result.error)
    }
  } catch (err) {
    console.error("[GET /api/settings] getUser threw:", err)
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Ошибка при проверке аутентификации",
        },
      },
      { status: 500 }
    )
  }

  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Требуется аутентификация",
        },
      },
      { status: 401 }
    )
  }

  const ownerId = await getPrimaryWorkspace(user.id)
  const workspaceRole = await getWorkspaceRole(user.id, ownerId)
  const canEditWorkspace = workspaceRole === "owner"

  // ── Step 2: Fetch current user's profile identity ──
  let profileData = null
  try {
    const { data: pData, error: pErr } = await supabase
      .from("profiles")
      .select("full_name, phone, position")
      .eq("id", user.id)
      .single()

    if (pErr && pErr.code !== "PGRST116") {
      console.error("[GET /api/settings] profiles query failed:", pErr)
    } else {
      profileData = pData
    }
  } catch (err) {
    console.error("[GET /api/settings] profiles query threw:", err)
  }

  // ── Step 3: Fetch current workspace owner's profile identity ──
  let workspaceProfileData = null
  try {
    const { data: wpData, error: wpErr } = await supabase
      .from("profiles")
      .select("workspace_name")
      .eq("id", ownerId)
      .single()

    if (wpErr && wpErr.code !== "PGRST116") {
      console.error(
        "[GET /api/settings] workspace profile query failed:",
        wpErr
      )
    } else {
      workspaceProfileData = wpData
    }
  } catch (err) {
    console.error("[GET /api/settings] workspace profile query threw:", err)
  }

  // ── Step 4: Fetch user_settings for current user and workspace owner ──
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("profile, preferences, notifications, security, updated_at")
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("[GET /api/settings] user_settings query failed:", error)
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Ошибка при загрузке настроек",
            details: error.message,
          },
        },
        { status: 500 }
      )
    }

    const { data: workspaceSettings, error: workspaceSettingsError } =
      await supabase
        .from("user_settings")
        .select("workspace")
        .eq("user_id", ownerId)
        .single()

    if (workspaceSettingsError && workspaceSettingsError.code !== "PGRST116") {
      console.error(
        "[GET /api/settings] workspace settings query failed:",
        workspaceSettingsError
      )
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Ошибка при загрузке настроек workspace",
            details: workspaceSettingsError.message,
          },
        },
        { status: 500 }
      )
    }

    // Merge profiles (public identity) + user_settings.profile (language, timezone)
    const mergedProfile = {
      displayName: profileData?.full_name ?? "",
      email: user.email ?? "",
      phone: profileData?.phone ?? "",
      jobTitle: profileData?.position ?? "",
      language: data?.profile?.language ?? "ru",
      timezone: data?.profile?.timezone ?? "UTC",
    }

    // Workspace data is owned by the current workspace owner, not by each member.
    const mergedWorkspace = {
      workspaceName: workspaceProfileData?.workspace_name ?? "",
      companyLegalName: workspaceSettings?.workspace?.companyLegalName ?? "",
      companyType: workspaceSettings?.workspace?.companyType ?? "",
      registrationNumber:
        workspaceSettings?.workspace?.registrationNumber ?? "",
      taxNumber: workspaceSettings?.workspace?.taxNumber ?? "",
      legalAddress: workspaceSettings?.workspace?.legalAddress ?? "",
      billingEmail: workspaceSettings?.workspace?.billingEmail ?? "",
      companyPhone: workspaceSettings?.workspace?.companyPhone ?? "",
      defaultCurrency: workspaceSettings?.workspace?.defaultCurrency ?? "RUB",
      defaultLocale: workspaceSettings?.workspace?.defaultLocale ?? "ru-RU",
      defaultTimezone: workspaceSettings?.workspace?.defaultTimezone ?? "UTC",
    }

    const security = {
      twoFactorEnabled: data?.security?.twoFactorEnabled ?? false,
      lastLogin: user.last_sign_in_at ?? null,
    }

    return NextResponse.json({
      data: {
        profile: mergedProfile,
        workspace: mergedWorkspace,
        workspaceAccess: {
          role: workspaceRole,
          canEditWorkspace,
        },
        preferences: data?.preferences ?? {},
        notifications: data?.notifications ?? {},
        security,
      },
      meta: { updatedAt: data?.updated_at ?? null },
    })
  } catch (err: any) {
    console.error("[GET /api/settings] unexpected error:", err)
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Ошибка при загрузке настроек",
          details: err?.message,
        },
      },
      { status: 500 }
    )
  }
}

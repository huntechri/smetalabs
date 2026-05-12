import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { supabase } from "@/db"

/**
 * GET /api/settings
 *
 * Возвращает настройки текущего пользователя.
 * Формат ответа:
 * {
 *   "data": { profile, workspace, preferences, notifications, security },
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

  // ── Step 2: Fetch profiles (public identity) ──
  let profileData = null
  try {
    const { data: pData, error: pErr } = await supabase
      .from("profiles")
      .select("full_name, phone, position, workspace_name")
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

  // ── Step 3: Fetch user_settings (service_role bypasses RLS) ──
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("profile, workspace, preferences, notifications, security, updated_at")
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

    // Merge profiles (public identity) + user_settings.profile (language, timezone)
    const mergedProfile = {
      displayName: profileData?.full_name ?? "",
      email: user.email ?? "",
      phone: profileData?.phone ?? "",
      jobTitle: profileData?.position ?? "",
      language: data?.profile?.language ?? "ru",
      timezone: data?.profile?.timezone ?? "UTC",
    }

    // Merge profiles.workspace_name + user_settings.workspace (legal requisites)
    const mergedWorkspace = {
      workspaceName: profileData?.workspace_name ?? "",
      companyLegalName: data?.workspace?.companyLegalName ?? "",
      companyType: data?.workspace?.companyType ?? "",
      registrationNumber: data?.workspace?.registrationNumber ?? "",
      taxNumber: data?.workspace?.taxNumber ?? "",
      legalAddress: data?.workspace?.legalAddress ?? "",
      billingEmail: data?.workspace?.billingEmail ?? "",
      companyPhone: data?.workspace?.companyPhone ?? "",
      defaultCurrency: data?.workspace?.defaultCurrency ?? "RUB",
      defaultLocale: data?.workspace?.defaultLocale ?? "ru-RU",
      defaultTimezone: data?.workspace?.defaultTimezone ?? "UTC",
    }

    return NextResponse.json({
      data: {
        profile: mergedProfile,
        workspace: mergedWorkspace,
        preferences: data?.preferences ?? {},
        notifications: data?.notifications ?? {},
        security: data?.security ?? {},
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

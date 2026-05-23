"use server"

import { headers } from "next/headers"
import { requireAuth } from "@/lib/auth/permissions"
import { createClient } from "@/lib/supabase/server"

async function getRequestOrigin() {
  const headersList = await headers()
  const forwardedHost = headersList.get("x-forwarded-host")
  const host = forwardedHost ?? headersList.get("host") ?? "localhost:3000"
  const proto = headersList.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

export async function sendOwnPasswordResetEmailAction() {
  const user = await requireAuth()
  const client = await createClient()
  const origin = await getRequestOrigin()
  const { error } = await client.auth.resetPasswordForEmail(user.email!, {
    redirectTo: `${origin}/set-password`,
  })

  if (error) {
    throw new Error(
      `Ошибка отправки ссылки для сброса пароля: ${error.message}`
    )
  }

  return {
    success: true,
    message: "Ссылка для сброса пароля отправлена на email",
  }
}

export async function revokeOtherSessionsAction() {
  await requireAuth()
  const client = await createClient()

  const { error } = await client.auth.signOut({ scope: "others" })

  if (error) {
    throw new Error(`Ошибка завершения других сессий: ${error.message}`)
  }

  return {
    success: true,
    message: "Другие сессии завершены. Текущая сессия осталась активной.",
  }
}

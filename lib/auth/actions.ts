"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

/** Get current origin from request headers (works on Vercel preview + production) */
async function getOrigin() {
  const headersList = await headers()
  const host = headersList.get("host") ?? "localhost:3000"
  const proto = headersList.get("x-forwarded-proto") ?? "http"
  return `${proto}://${host}`
}

function getAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes("invalid login credentials")) {
    return "Неверный email или пароль"
  }
  if (normalized.includes("email not confirmed")) {
    return "Подтвердите email перед входом"
  }
  if (
    normalized.includes("user already registered") ||
    normalized.includes("already registered")
  ) {
    return "Пользователь с таким email уже зарегистрирован"
  }
  if (normalized.includes("password") && normalized.includes("weak")) {
    return "Пароль слишком простой"
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Слишком много попыток. Попробуйте позже"
  }

  return "Не удалось выполнить действие. Проверьте данные и попробуйте ещё раз"
}

// ── Login ──
const loginSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(1, "Введите пароль"),
})

export type LoginState = {
  error?: string
  email?: string
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const supabase = await createClient()

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Ошибка валидации",
      email: formData.get("email") as string,
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    return {
      error: getAuthErrorMessage(error.message),
      email: parsed.data.email,
    }
  }

  if (data?.session) {
    revalidatePath("/", "layout")
    redirect("/dashboard")
  }

  return { error: "Не удалось войти", email: parsed.data.email }
}

// ── Sign Up ──
const signupSchema = z
  .object({
    email: z.string().email("Введите корректный email"),
    password: z.string().min(8, "Пароль должен быть не менее 8 символов"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  })

export type SignupState = {
  error?: string
  email?: string
  success?: boolean
}

export async function signupAction(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const supabase = await createClient()

  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Ошибка валидации",
      email: formData.get("email") as string,
    }
  }

  const origin = await getOrigin()

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return {
      error: getAuthErrorMessage(error.message),
      email: parsed.data.email,
    }
  }

  return { success: true, email: parsed.data.email }
}

// ── Forgot Password ──
const forgotPasswordSchema = z.object({
  email: z.string().email("Введите корректный email"),
})

export type ForgotPasswordState = {
  error?: string
  email?: string
  success?: boolean
}

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const supabase = await createClient()

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  })

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Ошибка валидации",
      email: formData.get("email") as string,
    }
  }

  const origin = await getOrigin()

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${origin}/set-password`,
    }
  )

  if (error) {
    return {
      error: getAuthErrorMessage(error.message),
      email: parsed.data.email,
    }
  }

  return { success: true, email: parsed.data.email }
}

// ── Sign Out ──
export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}

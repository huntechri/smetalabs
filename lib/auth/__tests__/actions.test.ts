import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signOut: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
  headers: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      signOut: mocks.signOut,
    },
  })),
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}))

vi.mock("next/headers", () => ({
  headers: mocks.headers,
}))

const { forgotPasswordAction, loginAction, signupAction } =
  await import("../actions")

function form(entries: Record<string, string>) {
  const formData = new FormData()
  Object.entries(entries).forEach(([key, value]) => formData.set(key, value))
  return formData
}

describe("auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.headers.mockResolvedValue(
      new Headers({ host: "app.example.test", "x-forwarded-proto": "https" })
    )
    mocks.signInWithPassword.mockResolvedValue({ data: {}, error: null })
    mocks.signUp.mockResolvedValue({ data: {}, error: null })
    mocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
  })

  it("returns login validation errors before redirecting", async () => {
    const result = await loginAction(
      {},
      form({ email: "bad-email", password: "" })
    )

    expect(result).toEqual({
      error: "Введите корректный email",
      email: "bad-email",
    })
    expect(mocks.signInWithPassword).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it("maps Supabase login errors to user-facing messages", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: "Invalid login credentials" },
    })

    await expect(
      loginAction({}, form({ email: "user@example.com", password: "secret" }))
    ).resolves.toEqual({
      error: "Неверный email или пароль",
      email: "user@example.com",
    })
  })

  it("redirects successful logins to dashboard", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    })

    await expect(
      loginAction({}, form({ email: "user@example.com", password: "secret" }))
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard")
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout")
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard")
  })

  it("validates signup email, password length, and confirmation", async () => {
    await expect(
      signupAction(
        {},
        form({
          email: "bad",
          password: "123",
          confirmPassword: "456",
        })
      )
    ).resolves.toMatchObject({ error: "Введите корректный email" })

    await expect(
      signupAction(
        {},
        form({
          email: "user@example.com",
          password: "123",
          confirmPassword: "123",
        })
      )
    ).resolves.toMatchObject({
      error: "Пароль должен быть не менее 8 символов",
    })

    await expect(
      signupAction(
        {},
        form({
          email: "user@example.com",
          password: "12345678",
          confirmPassword: "87654321",
        })
      )
    ).resolves.toMatchObject({ error: "Пароли не совпадают" })
  })

  it("builds auth callback redirect URLs for signup", async () => {
    const result = await signupAction(
      {},
      form({
        email: "user@example.com",
        password: "12345678",
        confirmPassword: "12345678",
      })
    )

    expect(result).toEqual({ success: true, email: "user@example.com" })
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "12345678",
      options: {
        emailRedirectTo: "https://app.example.test/auth/callback",
      },
    })
  })

  it("builds set-password redirect URLs for forgot password", async () => {
    const result = await forgotPasswordAction(
      {},
      form({ email: "user@example.com" })
    )

    expect(result).toEqual({ success: true, email: "user@example.com" })
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "user@example.com",
      { redirectTo: "https://app.example.test/set-password" }
    )
  })
})

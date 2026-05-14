import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PreferencesSettingsCard } from "../preferences-settings-card"
import { SecuritySettingsCard } from "../security-settings-card"

vi.mock("@/app/actions/settings", () => ({
  revokeOtherSessionsAction: vi.fn(),
  sendOwnPasswordResetEmailAction: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

describe("account settings disabled/future contracts", () => {
  it("keeps preferences visibly disabled as future scope", () => {
    render(
      <PreferencesSettingsCard
        preferences={{ theme: "dark" }}
        loading={false}
        error={null}
        refetch={async () => undefined}
      />
    )

    expect(screen.getByText("Скоро")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Функция в разработке" })
    ).toBeDisabled()
    expect(screen.getByText(/пока не влияют на интерфейс/i)).toBeInTheDocument()
  })

  it("keeps 2FA disabled while implemented security actions stay active", () => {
    render(
      <SecuritySettingsCard
        security={{ twoFactorEnabled: false, lastLogin: null }}
        loading={false}
        error={null}
        refetch={async () => undefined}
      />
    )

    expect(
      screen.getByRole("button", { name: "Настроить · скоро" })
    ).toBeDisabled()
    expect(screen.getByRole("button", { name: "Сменить пароль" })).toBeEnabled()
    expect(
      screen.getByRole("button", { name: "Завершить другие" })
    ).toBeEnabled()
  })
})

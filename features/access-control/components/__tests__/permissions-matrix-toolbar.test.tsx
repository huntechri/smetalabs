import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PermissionsMatrixToolbar } from "../permissions-matrix-toolbar"

describe("permissions matrix toolbar", () => {
  it("keeps matrix persistence disabled and labelled as future scope", () => {
    render(<PermissionsMatrixToolbar onReset={vi.fn()} />)

    expect(screen.getByRole("button", { name: "Сбросить" })).toBeEnabled()
    expect(
      screen.getByRole("button", { name: "Сохранить · скоро" })
    ).toBeDisabled()
  })
})

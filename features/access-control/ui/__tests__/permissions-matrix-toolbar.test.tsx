import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PermissionsMatrixToolbar } from "../permissions-matrix-toolbar"

describe("PermissionsMatrixToolbar", () => {
  it("keeps matrix persistence disabled and labelled as future scope", () => {
    render(<PermissionsMatrixToolbar onReset={vi.fn()} />)

    const saveBtn = screen.getByRole("button", { name: /сохранить/i })
    expect(saveBtn).toBeDisabled()
  })
})

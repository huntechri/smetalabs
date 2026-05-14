import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { usePermissionMatrixState } from "../use-permission-matrix-state"
import type { Role } from "@/types/roles"
import type { PermissionKey } from "../../types"

const initialMatrix: Record<Role, PermissionKey[]> = {
  owner: ["projects.read", "team.read"],
  admin: [],
  manager: ["projects.read"],
  estimator: [],
  viewer: [],
}

describe("usePermissionMatrixState", () => {
  it("toggles permissions and resets back to the latest initial matrix", () => {
    const { result, rerender } = renderHook(
      ({ matrix }) => usePermissionMatrixState(matrix),
      { initialProps: { matrix: initialMatrix } }
    )

    act(() => result.current.togglePermission("manager", "team.read"))
    expect(result.current.matrix.manager).toEqual([
      "projects.read",
      "team.read",
    ])

    act(() => result.current.togglePermission("manager", "projects.read"))
    expect(result.current.matrix.manager).toEqual(["team.read"])

    const nextInitialMatrix: Record<Role, PermissionKey[]> = {
      owner: ["projects.read"],
      admin: [],
      manager: [],
      estimator: [],
      viewer: [],
    }
    rerender({ matrix: nextInitialMatrix })
    expect(result.current.matrix).toBe(nextInitialMatrix)

    act(() => result.current.togglePermission("manager", "team.read"))
    expect(result.current.matrix.manager).toEqual(["team.read"])

    act(() => result.current.resetMatrix())
    expect(result.current.matrix).toBe(nextInitialMatrix)
  })
})

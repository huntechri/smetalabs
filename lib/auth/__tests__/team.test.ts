import { beforeEach, describe, expect, it, vi } from "vitest"

const orderMock = vi.fn()
const eqMock = vi.fn(() => ({ order: orderMock }))
const selectMock = vi.fn(() => ({ eq: eqMock }))
const fromMock = vi.fn(() => ({ select: selectMock }))

vi.mock("@/db", () => ({
  supabase: {
    from: fromMock,
  },
}))

const { getPrimaryWorkspace } = await import("../team")

function mockWorkspaceMembers(rows: unknown[], error: unknown = null) {
  orderMock.mockResolvedValueOnce({ data: rows, error })
}

describe("getPrimaryWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("prefers the user's own active workspace", async () => {
    mockWorkspaceMembers([
      { owner_id: "owner-2", user_id: "user-1", status: "active" },
      { owner_id: "user-1", user_id: "user-1", status: "active" },
    ])

    await expect(getPrimaryWorkspace("user-1")).resolves.toBe("user-1")
    expect(fromMock).toHaveBeenCalledWith("workspace_members")
  })

  it("uses the oldest active membership when there is no own workspace", async () => {
    mockWorkspaceMembers([
      { owner_id: "owner-1", user_id: "user-1", status: "active" },
      { owner_id: "owner-2", user_id: "user-1", status: "active" },
    ])

    await expect(getPrimaryWorkspace("user-1")).resolves.toBe("owner-1")
  })

  it("does not fall back to a synthetic workspace for invited or suspended members", async () => {
    mockWorkspaceMembers([
      { owner_id: "owner-1", user_id: "user-1", status: "invited" },
    ])

    await expect(getPrimaryWorkspace("user-1")).rejects.toThrow(
      "WORKSPACE_MEMBER_REQUIRED"
    )
  })

  it("falls back to user id only when no membership rows exist", async () => {
    mockWorkspaceMembers([])

    await expect(getPrimaryWorkspace("user-1")).resolves.toBe("user-1")
  })
})

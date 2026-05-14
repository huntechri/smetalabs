import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCurrentWorkspace: vi.fn(),
  canReadTeamForWorkspace: vi.fn(),
  canManageTeamForWorkspace: vi.fn(),
}))

vi.mock("@/lib/auth/permissions", () => ({ requireAuth: mocks.requireAuth }))
vi.mock("@/lib/auth/team", () => ({
  requireCurrentWorkspace: mocks.requireCurrentWorkspace,
  canReadTeamForWorkspace: mocks.canReadTeamForWorkspace,
  canManageTeamForWorkspace: mocks.canManageTeamForWorkspace,
}))
vi.mock("@/db", () => ({ supabase: { from: vi.fn() } }))

const inviteLinkRoute = await import("../invite-link/route")
const domainsRoute = await import("../domains/route")

describe("team future API contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAuth.mockResolvedValue({ id: "user-1" })
    mocks.requireCurrentWorkspace.mockResolvedValue("owner-1")
    mocks.canReadTeamForWorkspace.mockResolvedValue(true)
    mocks.canManageTeamForWorkspace.mockResolvedValue(true)
  })

  it("returns explicit 501 for invite link GET/PATCH", async () => {
    const getResponse = await inviteLinkRoute.GET()
    const patchResponse = await inviteLinkRoute.PATCH(
      new NextRequest("https://app.test/api/team/invite-link", {
        method: "PATCH",
      })
    )

    expect(getResponse.status).toBe(501)
    expect(patchResponse.status).toBe(501)
    await expect(getResponse.json()).resolves.toMatchObject({
      error: { code: "NOT_IMPLEMENTED" },
    })
  })

  it("returns 403 for forbidden invite link management", async () => {
    mocks.canManageTeamForWorkspace.mockResolvedValue(false)

    const response = await inviteLinkRoute.PATCH(
      new NextRequest("https://app.test/api/team/invite-link", {
        method: "PATCH",
      })
    )

    expect(response.status).toBe(403)
  })

  it("returns explicit 501 for domain auto-join PATCH", async () => {
    const response = await domainsRoute.PATCH(
      new NextRequest("https://app.test/api/team/domains", {
        method: "PATCH",
        body: JSON.stringify({ autoJoinDomains: true }),
      })
    )

    expect(response.status).toBe(501)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "NOT_IMPLEMENTED" },
    })
  })
})

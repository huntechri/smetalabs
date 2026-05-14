import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  requireCurrentWorkspace: vi.fn(),
  canReadTeamForWorkspace: vi.fn(),
  from: vi.fn(),
}))

vi.mock("@/lib/auth/permissions", () => ({
  requireAuth: mocks.requireAuth,
}))

vi.mock("@/lib/auth/team", () => ({
  requireCurrentWorkspace: mocks.requireCurrentWorkspace,
  canReadTeamForWorkspace: mocks.canReadTeamForWorkspace,
}))

vi.mock("@/db", () => ({
  supabase: { from: mocks.from },
}))

const { GET } = await import("../route")

function request() {
  return new NextRequest("https://app.test/api/access-control/roles")
}

describe("GET /api/access-control/roles", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.test")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role")
    mocks.requireAuth.mockResolvedValue({ id: "user-1" })
    mocks.requireCurrentWorkspace.mockResolvedValue("owner-1")
    mocks.canReadTeamForWorkspace.mockResolvedValue(true)
    mocks.from.mockImplementation((table: string) => ({
      select: vi.fn(async () => {
        if (table === "roles") {
          return {
            data: [
              {
                id: "role-owner",
                name: "owner",
                label: "Владелец",
                locked: true,
                description: null,
                created_at: "2026-01-01T00:00:00.000Z",
              },
            ],
            error: null,
          }
        }
        if (table === "role_permissions") {
          return {
            data: [{ role_id: "role-owner", permission_id: "perm-read" }],
            error: null,
          }
        }
        return {
          data: [
            {
              id: "perm-read",
              key: "team.read",
              label: "Читать команду",
              group_name: "team",
              description: null,
            },
          ],
          error: null,
        }
      }),
    }))
  })

  it("requires authentication", async () => {
    mocks.requireAuth.mockRejectedValue(new Error("Unauthorized"))

    const response = await GET(request())

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    })
  })

  it("returns 403 when the current workspace cannot be read", async () => {
    mocks.canReadTeamForWorkspace.mockResolvedValue(false)

    const response = await GET(request())

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "FORBIDDEN" },
    })
  })

  it("returns workspace-authorized roles with permissions", async () => {
    const response = await GET(request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.requireCurrentWorkspace).toHaveBeenCalledWith("user-1")
    expect(mocks.canReadTeamForWorkspace).toHaveBeenCalledWith(
      "user-1",
      "owner-1"
    )
    expect(body.data[0]).toMatchObject({
      name: "owner",
      permissions: [{ key: "team.read", groupName: "team" }],
    })
  })
})

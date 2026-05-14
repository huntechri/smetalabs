import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getPrimaryWorkspace: vi.fn(),
  getWorkspaceRole: vi.fn(),
  from: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser } })),
}))

vi.mock("@/lib/auth/team", () => ({
  getPrimaryWorkspace: mocks.getPrimaryWorkspace,
  getWorkspaceRole: mocks.getWorkspaceRole,
}))

vi.mock("@/db", () => ({
  supabase: { from: mocks.from },
}))

const { GET } = await import("../route")

function queryResult(table: string) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((_column: string, value: string) => ({
      single: vi.fn(async () => {
        if (table === "profiles" && value === "user-1") {
          return {
            data: { full_name: "Ada", phone: "+1", position: "Estimator" },
            error: null,
          }
        }
        if (table === "profiles" && value === "owner-1") {
          return { data: { workspace_name: "Owner workspace" }, error: null }
        }
        if (table === "user_settings" && value === "user-1") {
          return {
            data: {
              profile: { language: "ru", timezone: "Europe/Moscow" },
              preferences: { theme: "dark" },
              notifications: { emailUpdates: true },
              security: { twoFactorEnabled: true },
              updated_at: "2026-05-14T00:00:00.000Z",
            },
            error: null,
          }
        }
        if (table === "user_settings" && value === "owner-1") {
          return {
            data: {
              workspace: {
                companyLegalName: "Smeta LLC",
                defaultCurrency: "USD",
              },
            },
            error: null,
          }
        }
        return { data: null, error: { code: "PGRST116" } }
      }),
    })),
  }
  return chain
}

describe("GET /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "ada@example.com",
          last_sign_in_at: "2026-05-13T00:00:00.000Z",
        },
      },
      error: null,
    })
    mocks.getPrimaryWorkspace.mockResolvedValue("owner-1")
    mocks.getWorkspaceRole.mockResolvedValue("admin")
    mocks.from.mockImplementation((table: string) => queryResult(table))
  })

  it("requires authentication", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("merges auth user, profile, user settings, and owner workspace settings", async () => {
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data.profile).toEqual({
      displayName: "Ada",
      email: "ada@example.com",
      phone: "+1",
      jobTitle: "Estimator",
      language: "ru",
      timezone: "Europe/Moscow",
    })
    expect(body.data.workspace).toMatchObject({
      workspaceName: "Owner workspace",
      companyLegalName: "Smeta LLC",
      defaultCurrency: "USD",
    })
    expect(body.data.workspaceAccess).toEqual({
      role: "admin",
      canEditWorkspace: false,
    })
    expect(body.data.security).toEqual({
      twoFactorEnabled: true,
      lastLogin: "2026-05-13T00:00:00.000Z",
    })
    expect(body.meta.updatedAt).toBe("2026-05-14T00:00:00.000Z")
  })

  it("allows only the owner role to edit workspace settings", async () => {
    mocks.getWorkspaceRole.mockResolvedValue("owner")

    const response = await GET()
    const body = await response.json()

    expect(body.data.workspaceAccess).toEqual({
      role: "owner",
      canEditWorkspace: true,
    })
  })
})

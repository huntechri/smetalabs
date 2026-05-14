import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchSettings } from "../settings-client"

describe("settings client", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns settings data from API response", async () => {
    const data = {
      profile: { displayName: "Ada", email: "ada@example.com" },
      workspace: { workspaceName: "Smeta" },
      workspaceAccess: { role: "owner", canEditWorkspace: true },
      preferences: { theme: "system" },
      notifications: { emailUpdates: true },
      security: { twoFactorEnabled: false },
    }
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchSettings()).resolves.toEqual(data)
    expect(fetchMock).toHaveBeenCalledWith("/api/settings")
  })

  it("throws normalized API error messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            {
              error: {
                code: "UNAUTHORIZED",
                message: "Требуется аутентификация",
              },
            },
            { status: 401 }
          )
        )
    )

    await expect(fetchSettings()).rejects.toThrow("Требуется аутентификация")
  })

  it("falls back to HTTP status when error body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("oops", { status: 500 }))
    )

    await expect(fetchSettings()).rejects.toThrow("Ошибка загрузки: 500")
  })
})

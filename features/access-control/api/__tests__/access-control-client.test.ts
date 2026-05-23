import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchAccessRoles } from "../access-control-client"

describe("access-control client", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("fetches roles with credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: [{ id: "owner", name: "owner", permissions: [] }],
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchAccessRoles()).resolves.toEqual([
      { id: "owner", name: "owner", permissions: [] },
    ])
    expect(fetchMock).toHaveBeenCalledWith("/api/access-control/roles", {
      credentials: "include",
    })
  })

  it.each([
    [401, "Необходимо войти в систему"],
    [403, "Недостаточно прав для доступа"],
    [404, "API для ролей не найден"],
    [500, "Ошибка сервера при загрузке ролей: db down"],
  ])("maps %i responses", async (status, message) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: { message: "db down" } }, { status })
        )
    )

    await expect(fetchAccessRoles()).rejects.toThrow(message)
  })
})

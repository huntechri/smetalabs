import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createWorkspaceDomain,
  createWorkspaceInvitation,
  fetchWorkspaceDomains,
  fetchWorkspaceInviteLink,
  fetchWorkspaceMembers,
  patchWorkspaceInviteLink,
  resendWorkspaceInvitation,
  updateWorkspaceAutoJoinDomains,
} from "../team-client"

describe("team client", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("fetches members with credentials and maps API members", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: [
          {
            id: "user-1",
            name: "Ada",
            email: "ada@example.com",
            avatarUrl: null,
            phone: null,
            position: null,
            primaryRole: "admin",
            primaryRoleLabel: "Администратор",
            roles: [
              { id: "role-admin", name: "admin", label: "Администратор" },
            ],
            status: "active",
            joinedAt: "2026-01-01T00:00:00.000Z",
            lastActiveAt: null,
          },
        ],
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    const members = await fetchWorkspaceMembers()

    expect(fetchMock).toHaveBeenCalledWith("/api/team/members", {
      credentials: "include",
      headers: undefined,
    })
    expect(members[0]).toMatchObject({
      id: "user-1",
      name: "Ada",
      role: "admin",
      status: "active",
    })
  })

  it("returns invitation warning when email delivery failed but the invite was stored", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          data: { id: "invite-1", email: "new@example.com", role: "viewer" },
          meta: { emailSent: false, emailError: "SMTP disabled" },
        })
      )
    )

    await expect(
      createWorkspaceInvitation("new@example.com", "viewer", "hi")
    ).resolves.toEqual({
      data: { id: "invite-1", email: "new@example.com", role: "viewer" },
      warning: "Приглашение сохранено, но письмо не отправлено: SMTP disabled",
    })
  })

  it("normalizes team API errors from JSON error envelopes", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { code: "FORBIDDEN", message: "Недостаточно прав" } },
            { status: 403 }
          )
        )
    )

    await expect(createWorkspaceDomain("example.com")).rejects.toThrow(
      "Недостаточно прав"
    )
  })

  it("keeps allowed domains and auto-join calls workspace API scoped endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          data: [{ id: "domain-1", domain: "example.com" }],
          meta: { autoJoinDomains: true },
        })
      )
      .mockResolvedValueOnce(Response.json({ data: { id: "domain-2" } }))
      .mockResolvedValueOnce(Response.json({ success: true }, { status: 501 }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchWorkspaceDomains()).resolves.toEqual({
      domains: [{ id: "domain-1", domain: "example.com" }],
      autoJoin: true,
    })
    await createWorkspaceDomain("demo.test")
    await expect(updateWorkspaceAutoJoinDomains(false)).rejects.toThrow()

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/team/domains", {
      credentials: "include",
      headers: undefined,
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/team/domains", {
      credentials: "include",
      method: "POST",
      body: JSON.stringify({ domain: "demo.test" }),
      headers: { "Content-Type": "application/json" },
    })
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/team/domains", {
      credentials: "include",
      method: "PATCH",
      body: JSON.stringify({ autoJoinDomains: false }),
      headers: { "Content-Type": "application/json" },
    })
  })

  it("surfaces invite link as explicit API response instead of fake success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { error: { code: "NOT_IMPLEMENTED", message: "Скоро" } },
          { status: 501 }
        )
      )
      .mockResolvedValueOnce(
        Response.json(
          { error: { code: "NOT_IMPLEMENTED", message: "Скоро" } },
          { status: 501 }
        )
      )
    vi.stubGlobal("fetch", fetchMock)

    await expect(fetchWorkspaceInviteLink()).rejects.toThrow("Скоро")
    await expect(patchWorkspaceInviteLink({ enabled: true })).rejects.toThrow(
      "Скоро"
    )
  })

  it("resend invitation throws response message", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { message: "Приглашение не найдено" } },
            { status: 404 }
          )
        )
    )

    await expect(resendWorkspaceInvitation("missing")).rejects.toThrow(
      "Приглашение не найдено"
    )
  })
})

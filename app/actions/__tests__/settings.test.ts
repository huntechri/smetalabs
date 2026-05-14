import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  updateWorkspace: vi.fn(),
  updatePreferences: vi.fn(),
  updateNotifications: vi.fn(),
  sendReset: vi.fn(),
  revokeSessions: vi.fn(),
  leaveWorkspace: vi.fn(),
  transferOwnership: vi.fn(),
  deactivateAccount: vi.fn(),
  deleteWorkspace: vi.fn(),
}))

vi.mock("@/features/account-settings/server/profile.actions", () => ({
  updateProfile: mocks.updateProfile,
}))
vi.mock("@/features/account-settings/server/workspace.actions", () => ({
  updateWorkspace: mocks.updateWorkspace,
}))
vi.mock("@/features/account-settings/server/preferences.actions", () => ({
  updatePreferences: mocks.updatePreferences,
}))
vi.mock("@/features/account-settings/server/notifications.actions", () => ({
  updateNotifications: mocks.updateNotifications,
}))
vi.mock("@/features/account-settings/server/password.actions", () => ({
  sendOwnPasswordResetEmailAction: mocks.sendReset,
  revokeOtherSessionsAction: mocks.revokeSessions,
}))
vi.mock("@/features/account-settings/server/dangerous.actions", () => ({
  leaveWorkspaceAction: mocks.leaveWorkspace,
  transferWorkspaceOwnershipAction: mocks.transferOwnership,
  deactivateAccountAction: mocks.deactivateAccount,
  deleteWorkspaceAction: mocks.deleteWorkspace,
}))

const actions = await import("../settings")

describe("settings server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.values(mocks).forEach((mock) => mock.mockResolvedValue({ ok: true }))
  })

  it("delegates profile, workspace, preferences, and notification updates", async () => {
    await actions.updateProfile({ displayName: "Ada" })
    await actions.updateWorkspace({ workspaceName: "Smeta" })
    await actions.updatePreferences({ theme: "dark" })
    await actions.updateNotifications({ teamInvitations: true })

    expect(mocks.updateProfile).toHaveBeenCalledWith({ displayName: "Ada" })
    expect(mocks.updateWorkspace).toHaveBeenCalledWith({
      workspaceName: "Smeta",
    })
    expect(mocks.updatePreferences).toHaveBeenCalledWith({ theme: "dark" })
    expect(mocks.updateNotifications).toHaveBeenCalledWith({
      teamInvitations: true,
    })
  })

  it("delegates security and dangerous account actions", async () => {
    await actions.sendOwnPasswordResetEmailAction()
    await actions.revokeOtherSessionsAction()
    await actions.leaveWorkspaceAction()
    await actions.transferWorkspaceOwnershipAction({ targetUserId: "user-2" })
    await actions.deactivateAccountAction()
    await actions.deleteWorkspaceAction({ confirmation: "DELETE" })

    expect(mocks.sendReset).toHaveBeenCalledWith()
    expect(mocks.revokeSessions).toHaveBeenCalledWith()
    expect(mocks.leaveWorkspace).toHaveBeenCalledWith()
    expect(mocks.transferOwnership).toHaveBeenCalledWith({
      targetUserId: "user-2",
    })
    expect(mocks.deactivateAccount).toHaveBeenCalledWith()
    expect(mocks.deleteWorkspace).toHaveBeenCalledWith({
      confirmation: "DELETE",
    })
  })
})

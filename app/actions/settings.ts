"use server"

import {
  deactivateAccountAction as deactivateAccount,
  deleteWorkspaceAction as deleteWorkspace,
  leaveWorkspaceAction as leaveWorkspace,
  transferWorkspaceOwnershipAction as transferWorkspaceOwnership,
} from "@/features/account-settings/server/dangerous.actions"
import {
  revokeOtherSessionsAction as revokeOtherSessions,
  sendOwnPasswordResetEmailAction as sendOwnPasswordResetEmail,
} from "@/features/account-settings/server/password.actions"
import { updateNotifications as updateAccountNotifications } from "@/features/account-settings/server/notifications.actions"
import { updatePreferences as updateAccountPreferences } from "@/features/account-settings/server/preferences.actions"
import { updateProfile as updateAccountProfile } from "@/features/account-settings/server/profile.actions"
import { updateWorkspace as updateAccountWorkspace } from "@/features/account-settings/server/workspace.actions"
import type {
  AccountPreferences,
  AccountProfile,
  NotificationSettings,
  WorkspaceSettings,
} from "@/features/account-settings/types"

export async function updateProfile(data: Partial<AccountProfile>) {
  return updateAccountProfile(data)
}

export async function updateWorkspace(data: Partial<WorkspaceSettings>) {
  return updateAccountWorkspace(data)
}

export async function updatePreferences(data: Partial<AccountPreferences>) {
  return updateAccountPreferences(data)
}

export async function updateNotifications(data: Partial<NotificationSettings>) {
  return updateAccountNotifications(data)
}

export async function sendOwnPasswordResetEmailAction() {
  return sendOwnPasswordResetEmail()
}

export async function revokeOtherSessionsAction() {
  return revokeOtherSessions()
}

export async function leaveWorkspaceAction() {
  return leaveWorkspace()
}

export async function transferWorkspaceOwnershipAction(input: {
  targetUserId: string
}) {
  return transferWorkspaceOwnership(input)
}

export async function deactivateAccountAction() {
  return deactivateAccount()
}

export async function deleteWorkspaceAction(input: { confirmation: string }) {
  return deleteWorkspace(input)
}

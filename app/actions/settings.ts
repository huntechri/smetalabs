"use server"

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

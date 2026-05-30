"use client"

import { useMemo } from "react"
import { toast } from "sonner"

import { ROLE_LABELS, type Role } from "@/types/roles"
import type { WorkspaceMember, MemberActions } from "../model/workspace-settings-model"

type WorkspaceMemberMutations = {
  updateRole: (userId: string, role: Role) => Promise<unknown>
  suspendMember: (userId: string, suspend: boolean) => Promise<unknown>
  removeMember: (userId: string) => Promise<unknown>
  resetPassword: (userId: string) => Promise<unknown>
}

type WorkspaceMemberDialogApi = {
  roleChangeTarget: WorkspaceMember | null
  removeTarget: WorkspaceMember | null
  resetPasswordTarget: WorkspaceMember | null
  suspendTarget: WorkspaceMember | null
  openRoleChange: (member: WorkspaceMember) => void
  closeRoleChange: () => void
  openRemove: (member: WorkspaceMember) => void
  closeRemove: () => void
  openResetPassword: (member: WorkspaceMember) => void
  closeResetPassword: () => void
  openSuspend: (member: WorkspaceMember) => void
  closeSuspend: () => void
}

export function useWorkspaceMemberActions(
  mutations: WorkspaceMemberMutations,
  dialogs: WorkspaceMemberDialogApi
) {
  return useMemo(() => {
    const handleChangeRole = async (member: WorkspaceMember, role: Role) => {
      if (member.role === role) return
      try {
        await mutations.updateRole(member.id, role)
        toast.success(
          `Роль участника ${member.name} изменена на «${ROLE_LABELS[role]}»`
        )
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Ошибка изменения роли"
        )
      }
    }

    const handleResetPassword = async () => {
      const target = dialogs.resetPasswordTarget
      if (!target) return

      try {
        await mutations.resetPassword(target.id)
        toast.success(`Ссылка для сброса пароля отправлена ${target.name}`)
        dialogs.closeResetPassword()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Ошибка сброса пароля")
      }
    }

    const handleToggleSuspend = async () => {
      const target = dialogs.suspendTarget
      if (!target) return

      const suspend = target.status !== "suspended"
      try {
        await mutations.suspendMember(target.id, suspend)
        toast.success(
          suspend
            ? `${target.name} заблокирован`
            : `${target.name} разблокирован`
        )
        dialogs.closeSuspend()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Ошибка изменения статуса"
        )
      }
    }

    const handleRemoveMember = async () => {
      const target = dialogs.removeTarget
      if (!target) return

      try {
        await mutations.removeMember(target.id)
        toast.success(`${target.name} удалён из workspace`)
        dialogs.closeRemove()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Ошибка удаления участника"
        )
      }
    }

    const handleConfirmRoleChange = async (role: Role) => {
      const target = dialogs.roleChangeTarget
      if (!target) return
      await handleChangeRole(target, role)
      dialogs.closeRoleChange()
    }

    const memberActions: MemberActions = {
      onChangeRole: handleChangeRole,
      onOpenRoleChange: dialogs.openRoleChange,
      onResetPassword: dialogs.openResetPassword,
      onToggleSuspend: dialogs.openSuspend,
      onRemoveMember: dialogs.openRemove,
    }

    return {
      memberActions,
      handleConfirmRoleChange,
      handleResetPassword,
      handleToggleSuspend,
      handleRemoveMember,
    }
  }, [dialogs, mutations])
}

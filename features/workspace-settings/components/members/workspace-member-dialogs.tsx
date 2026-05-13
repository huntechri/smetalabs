"use client"

import { RemoveMemberDialog } from "../remove-member-dialog"
import { ResetPasswordDialog } from "../reset-password-dialog"
import { RoleChangeDialog } from "../role-change-dialog"
import { SuspendMemberDialog } from "../suspend-member-dialog"
import type { WorkspaceMember } from "../../types"
import type { Role } from "@/types/roles"

type WorkspaceMemberDialogsProps = {
  roleChangeTarget: WorkspaceMember | null
  removeTarget: WorkspaceMember | null
  resetPasswordTarget: WorkspaceMember | null
  suspendTarget: WorkspaceMember | null
  closeRoleChange: () => void
  closeRemove: () => void
  closeResetPassword: () => void
  closeSuspend: () => void
  onConfirmRoleChange: (role: Role) => Promise<void>
  onResetPassword: () => Promise<void>
  onToggleSuspend: () => Promise<void>
  onRemoveMember: () => Promise<void>
}

export function WorkspaceMemberDialogs({
  roleChangeTarget,
  removeTarget,
  resetPasswordTarget,
  suspendTarget,
  closeRoleChange,
  closeRemove,
  closeResetPassword,
  closeSuspend,
  onConfirmRoleChange,
  onResetPassword,
  onToggleSuspend,
  onRemoveMember,
}: WorkspaceMemberDialogsProps) {
  return (
    <>
      <RoleChangeDialog
        open={roleChangeTarget !== null}
        onOpenChange={(open) => !open && closeRoleChange()}
        member={roleChangeTarget}
        onConfirm={onConfirmRoleChange}
      />
      <ResetPasswordDialog
        open={resetPasswordTarget !== null}
        onOpenChange={(open) => !open && closeResetPassword()}
        memberName={resetPasswordTarget?.name ?? "участнику"}
        onConfirm={onResetPassword}
      />
      <SuspendMemberDialog
        open={suspendTarget !== null}
        onOpenChange={(open) => !open && closeSuspend()}
        memberName={suspendTarget?.name ?? "участнику"}
        suspend={suspendTarget?.status !== "suspended"}
        onConfirm={onToggleSuspend}
      />
      <RemoveMemberDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && closeRemove()}
        member={removeTarget}
        onConfirm={onRemoveMember}
      />
    </>
  )
}

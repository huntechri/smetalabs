"use client"

import { useMemo, useState } from "react"
import type { WorkspaceMember } from "../../types"

export function useWorkspaceMemberDialogs() {
  const [roleChangeTarget, setRoleChangeTarget] =
    useState<WorkspaceMember | null>(null)
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(null)
  const [resetPasswordTarget, setResetPasswordTarget] =
    useState<WorkspaceMember | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<WorkspaceMember | null>(
    null
  )

  return useMemo(
    () => ({
      roleChangeTarget,
      removeTarget,
      resetPasswordTarget,
      suspendTarget,
      openRoleChange: setRoleChangeTarget,
      closeRoleChange: () => setRoleChangeTarget(null),
      openRemove: setRemoveTarget,
      closeRemove: () => setRemoveTarget(null),
      openResetPassword: setResetPasswordTarget,
      closeResetPassword: () => setResetPasswordTarget(null),
      openSuspend: setSuspendTarget,
      closeSuspend: () => setSuspendTarget(null),
    }),
    [roleChangeTarget, removeTarget, resetPasswordTarget, suspendTarget]
  )
}

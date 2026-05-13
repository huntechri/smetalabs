"use client"

import { useMemo } from "react"
import { User } from "@phosphor-icons/react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWorkspaceMembers } from "../../hooks/use-workspace-members"
import { useWorkspaceMemberActions } from "./use-workspace-member-actions"
import { useWorkspaceMemberDialogs } from "./use-workspace-member-dialogs"
import { WorkspaceMemberDialogs } from "./workspace-member-dialogs"
import { WorkspaceMembersError } from "./workspace-members-error"
import { WorkspaceMembersMobileList } from "./workspace-members-mobile-list"
import { WorkspaceMembersSkeleton } from "./workspace-members-skeleton"
import { WorkspaceMembersTableView } from "./workspace-members-table"

export function WorkspaceMembersSection() {
  const {
    members,
    loading,
    error,
    updateRole,
    suspendMember,
    removeMember,
    resetPassword,
  } = useWorkspaceMembers()
  const dialogs = useWorkspaceMemberDialogs()
  const mutations = useMemo(
    () => ({ updateRole, suspendMember, removeMember, resetPassword }),
    [removeMember, resetPassword, suspendMember, updateRole]
  )
  const {
    memberActions,
    handleConfirmRoleChange,
    handleResetPassword,
    handleToggleSuspend,
    handleRemoveMember,
  } = useWorkspaceMemberActions(mutations, dialogs)

  if (loading) {
    return <WorkspaceMembersSkeleton />
  }

  if (error) {
    return <WorkspaceMembersError error={error} />
  }

  return (
    <>
      <Card className="overflow-hidden border-dashed border-muted-foreground/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" />
              Участники ({members.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <WorkspaceMembersTableView
            members={members}
            actions={memberActions}
          />
          <WorkspaceMembersMobileList
            members={members}
            actions={memberActions}
          />
        </CardContent>
      </Card>
      <WorkspaceMemberDialogs
        roleChangeTarget={dialogs.roleChangeTarget}
        removeTarget={dialogs.removeTarget}
        resetPasswordTarget={dialogs.resetPasswordTarget}
        suspendTarget={dialogs.suspendTarget}
        closeRoleChange={dialogs.closeRoleChange}
        closeRemove={dialogs.closeRemove}
        closeResetPassword={dialogs.closeResetPassword}
        closeSuspend={dialogs.closeSuspend}
        onConfirmRoleChange={handleConfirmRoleChange}
        onResetPassword={handleResetPassword}
        onToggleSuspend={handleToggleSuspend}
        onRemoveMember={handleRemoveMember}
      />
    </>
  )
}

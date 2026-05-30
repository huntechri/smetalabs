"use client"

import { LockKey } from "@phosphor-icons/react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { ROLE_LABELS } from "@/types/roles"
import type { WorkspaceMember, MemberActions } from "../../model/workspace-settings-model"
import { getInitials } from "../../model/workspace-settings-model"
import { WorkspaceMemberActionsMenu } from "./workspace-member-actions-menu"
import { WorkspaceMemberStatusBadge } from "./workspace-member-status-badge"

export function WorkspaceMembersMobileList({
  members,
  actions,
}: {
  members: WorkspaceMember[]
  actions: MemberActions
}) {
  return (
    <div className="divide-y divide-border/50 sm:hidden">
      {members.map((member) => {
        const isOwner = member.role === "owner"
        const showEmail = Boolean(member.email && member.email !== member.name)

        return (
          <div
            key={member.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              isOwner && "bg-muted/30"
            )}
          >
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="text-[0.625rem]">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">
                {member.name}
                {isOwner && (
                  <LockKey className="ml-1 inline size-3 text-muted-foreground" />
                )}
              </p>
              {showEmail && (
                <p className="truncate text-[0.65rem] text-muted-foreground">
                  {member.email}
                </p>
              )}
              <div className="mt-1 flex items-center gap-2">
                <WorkspaceMemberStatusBadge status={member.status} />
                <span className="text-[0.6rem] text-muted-foreground">
                  {ROLE_LABELS[member.role]}
                </span>
              </div>
            </div>
            <WorkspaceMemberActionsMenu member={member} actions={actions} />
          </div>
        )
      })}
    </div>
  )
}

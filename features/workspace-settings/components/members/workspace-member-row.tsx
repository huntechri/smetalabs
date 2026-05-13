"use client"

import { LockKey } from "@phosphor-icons/react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ROLE_LABELS, type Role } from "@/types/roles"
import type { WorkspaceMember } from "../../types"
import {
  EDITABLE_ROLES,
  formatMemberActivity,
  getInitials,
  type MemberActions,
} from "./member-utils"
import { WorkspaceMemberActionsMenu } from "./workspace-member-actions-menu"
import { WorkspaceMemberStatusBadge } from "./workspace-member-status-badge"

export function WorkspaceMemberRow({
  member,
  actions,
}: {
  member: WorkspaceMember
  actions: MemberActions
}) {
  const isOwner = member.role === "owner"
  const showEmail = Boolean(member.email && member.email !== member.name)

  return (
    <TableRow className={cn(isOwner && "bg-muted/30")}>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="size-7">
            <AvatarFallback className="text-[0.625rem]">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">{member.name}</p>
            {showEmail && (
              <p className="truncate text-[0.65rem] text-muted-foreground">
                {member.email}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {isOwner ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <LockKey className="size-3" />
            <span>{ROLE_LABELS[member.role]}</span>
          </div>
        ) : (
          <Select
            value={member.role}
            disabled={isOwner}
            onValueChange={(role) =>
              void actions.onChangeRole(member, role as Role)
            }
          >
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDITABLE_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </TableCell>
      <TableCell>
        <WorkspaceMemberStatusBadge status={member.status} />
      </TableCell>
      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
        {formatMemberActivity(member)}
      </TableCell>
      <TableCell className="text-right">
        <WorkspaceMemberActionsMenu member={member} actions={actions} />
      </TableCell>
    </TableRow>
  )
}

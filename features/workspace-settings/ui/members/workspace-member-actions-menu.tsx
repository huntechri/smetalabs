"use client"

import { DotsThree } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { WorkspaceMember, MemberActions } from "../../model/workspace-settings-model"

export function WorkspaceMemberActionsMenu({
  member,
  actions,
}: {
  member: WorkspaceMember
  actions: MemberActions
}) {
  const isOwner = member.role === "owner"
  const suspendLabel =
    member.status === "suspended" ? "Разблокировать" : "Заблокировать"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "size-7 p-0",
            isOwner && "pointer-events-none opacity-30"
          )}
          disabled={isOwner}
        >
          <DotsThree className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Действия</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => actions.onOpenRoleChange(member)}>
          Изменить роль
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.onResetPassword(member)}>
          Сбросить пароль
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => actions.onToggleSuspend(member)}
        >
          {suspendLabel}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => actions.onRemoveMember(member)}
        >
          Удалить из workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

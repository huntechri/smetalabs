"use client"

import { DotsThree, LockKey, User } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { useWorkspaceMembers } from "../hooks/use-workspace-settings"
import type { Role } from "@/types/roles"
import { ROLE_LABELS } from "@/types/roles"
import { STATUS_LABELS } from "../types"
import type { WorkspaceMember } from "../types"

const EDITABLE_ROLES: Role[] = ["admin", "manager", "estimator", "viewer"]

type MemberActions = {
  onChangeRole: (member: WorkspaceMember, role: Role) => Promise<void>
  onOpenRoleChange: (member: WorkspaceMember) => void
  onResetPassword: (member: WorkspaceMember) => Promise<void>
  onToggleSuspend: (member: WorkspaceMember) => Promise<void>
  onRemoveMember: (member: WorkspaceMember) => Promise<void>
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
}

function formatDate(dateStr: string) {
  if (dateStr === "—") return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatRelative(dateStr: string) {
  if (dateStr === "—") return "—"
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "только что"
  if (diffMins < 60) return `${diffMins} мин. назад`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} ч. назад`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays} дн. назад`
  return formatDate(dateStr)
}

function StatusBadge({ status }: { status: WorkspaceMember["status"] }) {
  const variants: Record<WorkspaceMember["status"], "default" | "secondary" | "outline"> = {
    active: "default",
    invited: "secondary",
    suspended: "outline",
  }
  const colors: Record<WorkspaceMember["status"], string> = {
    active: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10",
    invited: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10",
    suspended: "bg-destructive/10 text-destructive hover:bg-destructive/10",
  }
  return (
    <Badge variant={variants[status]} className={cn("font-normal", colors[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

function MemberActionsMenu({ member, actions }: { member: WorkspaceMember; actions: MemberActions }) {
  const isOwner = member.role === "owner"
  const suspendLabel = member.status === "suspended" ? "Разблокировать" : "Заблокировать"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("size-7 p-0", isOwner && "opacity-30 pointer-events-none")}
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
        <DropdownMenuItem onClick={() => void actions.onResetPassword(member)}>
          Сбросить пароль
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void actions.onToggleSuspend(member)}>
          {suspendLabel}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => void actions.onRemoveMember(member)}>
          Удалить из workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MemberRow({ member, actions }: { member: WorkspaceMember; actions: MemberActions }) {
  const isOwner = member.role === "owner"

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
            <p className="truncate text-[0.65rem] text-muted-foreground">
              {member.email}
            </p>
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
            onValueChange={(role) => void actions.onChangeRole(member, role as Role)}
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
        <StatusBadge status={member.status} />
      </TableCell>
      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
        {formatRelative(member.lastActiveAt)}
      </TableCell>
      <TableCell className="text-right">
        <MemberActionsMenu member={member} actions={actions} />
      </TableCell>
    </TableRow>
  )
}

export function WorkspaceMembersTable() {
  const {
    members,
    loading,
    error,
    updateRole,
    suspendMember,
    removeMember,
    resetPassword,
  } = useWorkspaceMembers()

  const handleChangeRole = async (member: WorkspaceMember, role: Role) => {
    if (member.role === role) return
    try {
      await updateRole(member.id, role)
      toast.success(`Роль участника ${member.name} изменена на «${ROLE_LABELS[role]}»`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка изменения роли")
    }
  }

  const handleOpenRoleChange = (member: WorkspaceMember) => {
    const rolesList = EDITABLE_ROLES.map((role) => `${role} — ${ROLE_LABELS[role]}`).join("\n")
    const selected = window.prompt(`Введите новую роль для ${member.name}:\n${rolesList}`, member.role)
    if (!selected) return

    const role = selected.trim() as Role
    if (!EDITABLE_ROLES.includes(role)) {
      toast.error("Неизвестная роль")
      return
    }

    void handleChangeRole(member, role)
  }

  const handleResetPassword = async (member: WorkspaceMember) => {
    try {
      await resetPassword(member.id)
      toast.success(`Ссылка для сброса пароля отправлена ${member.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка сброса пароля")
    }
  }

  const handleToggleSuspend = async (member: WorkspaceMember) => {
    const suspend = member.status !== "suspended"
    try {
      await suspendMember(member.id, suspend)
      toast.success(suspend ? `${member.name} заблокирован` : `${member.name} разблокирован`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка изменения статуса")
    }
  }

  const handleRemoveMember = async (member: WorkspaceMember) => {
    if (!window.confirm(`Удалить ${member.name} из workspace?`)) return

    try {
      await removeMember(member.id)
      toast.success(`${member.name} удалён из workspace`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка удаления участника")
    }
  }

  const actions: MemberActions = {
    onChangeRole: handleChangeRole,
    onOpenRoleChange: handleOpenRoleChange,
    onResetPassword: handleResetPassword,
    onToggleSuspend: handleToggleSuspend,
    onRemoveMember: handleRemoveMember,
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <Card className="border-dashed border-muted-foreground/30 overflow-hidden">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <Card className="border-dashed border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4" />
            Участники
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-destructive">
            Не удалось загрузить список участников: {error}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>
            Попробовать снова
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-dashed border-muted-foreground/30 overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="size-4" />
            Участники ({members.length})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop table */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Участник</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="hidden md:table-cell">
                  Активность
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <MemberRow key={m.id} member={m} actions={actions} />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-border/50">
          {members.map((m) => {
            const isOwner = m.role === "owner"

            return (
              <div
                key={m.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  isOwner && "bg-muted/30"
                )}
              >
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="text-[0.625rem]">
                    {getInitials(m.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {m.name}
                    {isOwner && (
                      <LockKey className="ml-1 inline size-3 text-muted-foreground" />
                    )}
                  </p>
                  <p className="truncate text-[0.65rem] text-muted-foreground">
                    {m.email}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={m.status} />
                    <span className="text-[0.6rem] text-muted-foreground">
                      {ROLE_LABELS[m.role]}
                    </span>
                  </div>
                </div>
                <MemberActionsMenu member={m} actions={actions} />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useState } from "react"
import {
  Clock,
  Copy,
  DotsThree,
  Envelope,
  PaperPlaneTilt,
  Spinner,
  X,
} from "@phosphor-icons/react"
import { toast } from "sonner"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useInvitations } from "../hooks/use-workspace-settings"
import { ROLE_LABELS } from "@/types/roles"
import type { WorkspaceInvitation } from "../types"

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function InvitationStatusBadge({
  status,
}: {
  status: WorkspaceInvitation["status"]
}) {
  const variants: Record<WorkspaceInvitation["status"], "secondary" | "outline"> =
    {
      pending: "secondary",
      expired: "outline",
    }
  const colors: Record<WorkspaceInvitation["status"], string> = {
    pending: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10",
    expired: "bg-destructive/10 text-destructive hover:bg-destructive/10",
  }
  const labels: Record<WorkspaceInvitation["status"], string> = {
    pending: "Ожидает",
    expired: "Истекло",
  }
  return (
    <Badge
      variant={variants[status]}
      className={`font-normal ${colors[status]}`}
    >
      {labels[status]}
    </Badge>
  )
}

function InvitationRow({
  invitation,
  onCancel,
  onResend,
  isCancelling,
  isResending,
}: {
  invitation: WorkspaceInvitation
  onCancel: (id: string) => void
  onResend: (id: string) => void
  isCancelling: boolean
  isResending: boolean
}) {
  async function handleCancel() {
    try {
      await onCancel(invitation.id)
      toast.success(`Приглашение для ${invitation.email} отозвано`)
    } catch {
      toast.error("Ошибка отзыва приглашения")
    }
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Envelope className="size-3 text-muted-foreground shrink-0" />
          <span className="truncate text-xs font-mono">{invitation.email}</span>
        </div>
      </TableCell>
      <TableCell className="text-xs">{ROLE_LABELS[invitation.role as keyof typeof ROLE_LABELS] ?? invitation.role}</TableCell>
      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
        {invitation.invitedBy}
      </TableCell>
      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
        {formatDate(invitation.invitedAt)}
      </TableCell>
      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
        {formatDate(invitation.expiresAt)}
      </TableCell>
      <TableCell>
        <InvitationStatusBadge status={invitation.status} />
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="size-7 p-0">
              <DotsThree className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Действия</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onResend(invitation.id)}
              disabled={isResending || invitation.status === "expired"}
            >
              {isResending ? (
                <Spinner className="size-3.5 animate-spin" />
              ) : (
                <PaperPlaneTilt className="size-3.5" />
              )}
              Отправить повторно
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(invitation.email).then(
                  () => toast.success("Email скопирован"),
                  () => {}
                )
              }}
            >
              <Copy className="size-3.5" />
              Копировать email
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Spinner className="size-3.5 animate-spin" />
              ) : (
                <X className="size-3.5" />
              )}
              Отозвать
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

export function PendingInvitationsTable() {
  const { invitations, loading, error, refetch, cancelInvitation, resendInvitation } = useInvitations()
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)

  async function handleCancel(id: string) {
    setCancellingId(id)
    try {
      await cancelInvitation(id)
    } finally {
      setCancellingId(null)
    }
  }

  async function handleResend(id: string) {
    setResendingId(id)
    try {
      await resendInvitation(id)
      toast.success("Приглашение отправлено повторно")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка повторной отправки")
    } finally {
      setResendingId(null)
    }
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <Card className="border-dashed border-muted-foreground/30 overflow-hidden">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // ── Error state ──
  if (error && invitations.length === 0) {
    return (
      <Card className="border-dashed border-destructive/30 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4" />
            Ожидающие приглашения
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-destructive mb-3">Ошибка: {error}</p>
          <Button variant="outline" size="sm" onClick={refetch}>
            Повторить
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ── Empty state ──
  if (invitations.length === 0) {
    return (
      <Card className="border-dashed border-muted-foreground/30 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4" />
            Ожидающие приглашения
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Нет ожидающих приглашений</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-dashed border-muted-foreground/30 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4" />
          Ожидающие приглашения ({invitations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop table */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Пригласил
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  Отправлено
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  Истекает
                </TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((inv) => (
                <InvitationRow
                  key={inv.id}
                  invitation={inv}
                  onCancel={handleCancel}
                  onResend={handleResend}
                  isCancelling={cancellingId === inv.id}
                  isResending={resendingId === inv.id}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-border/50">
          {invitations.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Envelope className="size-3 text-muted-foreground shrink-0" />
                  <p className="truncate text-xs font-mono">{inv.email}</p>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <InvitationStatusBadge status={inv.status} />
                  <span className="text-[0.6rem] text-muted-foreground">
                    {ROLE_LABELS[inv.role as keyof typeof ROLE_LABELS] ?? inv.role} · {inv.invitedBy}
                  </span>
                </div>
                <p className="mt-0.5 text-[0.6rem] text-muted-foreground">
                  {formatDate(inv.invitedAt)} → {formatDate(inv.expiresAt)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="size-7 shrink-0 p-0">
                    <DotsThree className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Действия</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleResend(inv.id)}
                    disabled={resendingId === inv.id || inv.status === "expired"}
                  >
                    {resendingId === inv.id ? (
                      <Spinner className="size-3.5 animate-spin" />
                    ) : (
                      <PaperPlaneTilt className="size-3.5" />
                    )}
                    Отправить повторно
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      navigator.clipboard.writeText(inv.email).then(
                        () => toast.success("Email скопирован"),
                        () => {}
                      )
                    }}
                  >
                    <Copy className="size-3.5" />
                    Копировать email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={async () => {
                      await handleCancel(inv.id)
                      toast.success(`Приглашение для ${inv.email} отозвано`)
                    }}
                    disabled={cancellingId === inv.id}
                  >
                    {cancellingId === inv.id ? (
                      <Spinner className="size-3.5 animate-spin" />
                    ) : (
                      <X className="size-3.5" />
                    )}
                    Отозвать
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

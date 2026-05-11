"use client"

import { Clock, Copy, DotsThree, Envelope, PaperPlaneTilt, X } from "@phosphor-icons/react"

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { pendingInvitations } from "../__mocks__/workspace-settings"
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

function InvitationRow({ invitation }: { invitation: WorkspaceInvitation }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Envelope className="size-3 text-muted-foreground shrink-0" />
          <span className="truncate text-xs font-mono">{invitation.email}</span>
        </div>
      </TableCell>
      <TableCell className="text-xs">{ROLE_LABELS[invitation.role]}</TableCell>
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
            <DropdownMenuItem disabled={invitation.status === "expired"}>
              <PaperPlaneTilt className="size-3.5" />
              Отправить повторно
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="size-3.5" />
              Копировать ссылку
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              <X className="size-3.5" />
              Отозвать
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

export function PendingInvitationsTable() {
  return (
    <Card className="border-dashed border-muted-foreground/30 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4" />
          Ожидающие приглашения ({pendingInvitations.length})
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
              {pendingInvitations.map((inv) => (
                <InvitationRow key={inv.id} invitation={inv} />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-border/50">
          {pendingInvitations.map((inv) => (
            <div key={inv.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Envelope className="size-3 text-muted-foreground shrink-0" />
                  <p className="truncate text-xs font-mono">{inv.email}</p>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <InvitationStatusBadge status={inv.status} />
                  <span className="text-[0.6rem] text-muted-foreground">
                    {ROLE_LABELS[inv.role]} · {inv.invitedBy}
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
                  <DropdownMenuItem disabled={inv.status === "expired"}>
                    <PaperPlaneTilt className="size-3.5" />
                    Отправить повторно
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="size-3.5" />
                    Копировать ссылку
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive">
                    <X className="size-3.5" />
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

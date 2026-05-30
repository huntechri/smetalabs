"use client"

import { ShieldCheck } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { Role } from "@/types/roles"
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/types/roles"

const roles: Role[] = ["owner", "admin", "manager", "estimator", "viewer"]

const roleColors: Record<Role, string> = {
  owner: "bg-violet-500/10 text-violet-600 hover:bg-violet-500/10",
  admin: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/10",
  manager: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10",
  estimator: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10",
  viewer: "bg-slate-500/10 text-slate-600 hover:bg-slate-500/10",
}

export function WorkspaceRolesSummaryCard() {
  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4" />
          Сводка ролей
        </CardTitle>
        <CardDescription>
          Описание прав доступа для каждой роли в workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <div
            key={role}
            className="space-y-1.5 rounded-lg border border-dashed border-border/50 p-3"
          >
            <Badge
              variant="secondary"
              className={`text-xs font-medium ${roleColors[role]}`}
            >
              {ROLE_LABELS[role]}
            </Badge>
            <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
              {ROLE_DESCRIPTIONS[role]}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

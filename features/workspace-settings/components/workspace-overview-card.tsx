"use client"

import {
  Buildings,
  LockKey,
  Users,
  CheckCircle,
} from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

import { workspaceOverview } from "../__mocks__/workspace-settings"

export function WorkspaceOverviewCard() {
  const overview = workspaceOverview

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Buildings className="size-4" />
          Обзор workspace
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Название</span>
          <p className="text-sm font-medium">{overview.name}</p>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Slug</span>
          <p className="text-sm font-mono text-xs text-muted-foreground">
            {overview.slug}
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Компания</span>
          <p className="text-sm">{overview.companyName}</p>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Владелец</span>
          <p className="text-sm flex items-center gap-1.5">
            <LockKey className="size-3 text-muted-foreground" />
            {overview.ownerName}
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Тариф</span>
          <Badge variant="secondary" className="font-mono">
            {overview.planName}
          </Badge>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Участники</span>
          <p className="text-sm flex items-center gap-1.5">
            <Users className="size-3.5 text-muted-foreground" />
            {overview.currentMembers}/{overview.memberLimit}
          </p>
        </div>
      </CardContent>
      <Separator className="border-dashed" />
      <div className="flex items-center gap-2 px-6 py-3">
        <CheckCircle className="size-3.5 text-emerald-500" />
        <span className="text-xs text-muted-foreground">
          Статус: <span className="font-medium text-emerald-600">Active</span>
        </span>
      </div>
    </Card>
  )
}

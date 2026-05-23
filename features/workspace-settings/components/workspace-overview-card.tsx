"use client"

import { useMemo } from "react"
import { Buildings, LockKey, Users, CheckCircle } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

import { useWorkspaceOverview } from "../hooks/use-workspace-settings"

// ── Plan constants (из одного места) ──
const PLAN_NAME = "Pro"
const MEMBER_LIMIT = 15

export function WorkspaceOverviewCard() {
  const { overview, loading, error, refetch } = useWorkspaceOverview()

  // ── Loading skeleton ──
  if (loading) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // ── Error state ──
  if (error && !overview) {
    return (
      <Card className="border-dashed border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Buildings className="size-4" />
            Обзор workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-destructive">
            Не удалось загрузить данные: {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={refetch}
          >
            Повторить
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ── No data fallback ──
  if (!overview) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Buildings className="size-4" />
            Обзор workspace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Нет данных</p>
        </CardContent>
      </Card>
    )
  }

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
          <p className="font-mono text-sm text-xs text-muted-foreground">
            {overview.slug}
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Компания</span>
          <p className="text-sm">{overview.companyName}</p>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Владелец</span>
          <p className="flex items-center gap-1.5 text-sm">
            <LockKey className="size-3 text-muted-foreground" />
            {overview.ownerName}
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Тариф</span>
          <Badge variant="secondary" className="font-mono">
            {PLAN_NAME}
          </Badge>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Участники</span>
          <p className="flex items-center gap-1.5 text-sm">
            <Users className="size-3.5 text-muted-foreground" />
            {overview.currentMembers}/{MEMBER_LIMIT}
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

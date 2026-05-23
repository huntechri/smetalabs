"use client"

import { useState } from "react"
import { Globe, Plus, Spinner, X } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"

import { useDomains } from "../hooks/use-workspace-settings"

export function AllowedDomainsCard() {
  const {
    domains,
    autoJoin,
    loading,
    error,
    refetch,
    addDomain,
    removeDomain,
    setAutoJoinDomains,
  } = useDomains()

  const [newDomain, setNewDomain] = useState("")
  const [addingDomain, setAddingDomain] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [savingAutoJoin, setSavingAutoJoin] = useState(false)

  async function handleAdd() {
    const trimmed = newDomain.trim().toLowerCase()
    if (!trimmed) return

    setAddingDomain(true)
    try {
      const ok = await addDomain(trimmed)
      if (ok) {
        setNewDomain("")
        toast.success(`Домен @${trimmed} добавлен`)
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Ошибка добавления домена"
      )
    } finally {
      setAddingDomain(false)
    }
  }

  async function handleRemove(id: string, domain: string) {
    setRemovingId(id)
    try {
      const ok = await removeDomain(id)
      if (ok) {
        toast.success(`Домен @${domain} удалён`)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Ошибка удаления домена")
    } finally {
      setRemovingId(null)
    }
  }

  async function handleAutoJoinChange(checked: boolean) {
    setSavingAutoJoin(true)
    try {
      await setAutoJoinDomains(checked)
      toast.success(
        checked ? "Авто-присоединение включено" : "Авто-присоединение выключено"
      )
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Ошибка сохранения")
    } finally {
      setSavingAutoJoin(false)
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3.5 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-28 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    )
  }

  // ── Error state ──
  if (error && domains.length === 0) {
    return (
      <Card className="border-dashed border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="size-4" />
            Разрешённые домены
          </CardTitle>
          <CardDescription className="text-destructive">
            Ошибка загрузки: {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={refetch}>
            Повторить
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="size-4" />
              Разрешённые домены
            </CardTitle>
            <CardDescription>
              Пользователи с email из этих доменов могут присоединяться к
              workspace.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Domain list */}
        <div className="flex flex-wrap gap-2">
          {domains.map((d) => (
            <Badge
              key={d.id}
              variant="secondary"
              className="gap-1 pr-1 font-mono text-xs font-normal"
            >
              @{d.domain}
              <Button
                variant="ghost"
                size="sm"
                className="size-4 p-0 hover:bg-transparent"
                onClick={() => handleRemove(d.id, d.domain)}
                disabled={removingId === d.id}
              >
                {removingId === d.id ? (
                  <Spinner className="size-2.5 animate-spin" />
                ) : (
                  <X className="size-2.5" />
                )}
              </Button>
            </Badge>
          ))}
          {domains.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground">
              Нет разрешённых доменов
            </p>
          )}
        </div>

        {/* Add domain input */}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="new-domain" className="text-xs">
              Добавить домен
            </Label>
            <Input
              id="new-domain"
              placeholder="company.ru"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
              }}
              className="h-8 text-xs"
              disabled={addingDomain}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 shrink-0 gap-1.5"
            onClick={handleAdd}
            disabled={!newDomain.trim() || addingDomain}
          >
            {addingDomain ? (
              <Spinner className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Добавить
          </Button>
        </div>

        {/* Auto-join toggle */}
        <div className="flex items-center justify-between rounded-lg border border-dashed border-border/50 p-3">
          <div className="space-y-0.5">
            <Label htmlFor="auto-join" className="text-xs font-medium">
              Автоматическое присоединение
            </Label>
            <p className="text-[0.65rem] text-muted-foreground">
              Новые пользователи из разрешённых доменов автоматически получают
              доступ.
            </p>
          </div>
          <Switch
            id="auto-join"
            checked={autoJoin}
            onCheckedChange={handleAutoJoinChange}
            disabled={savingAutoJoin}
          />
        </div>

        {/* Error indicator for partial failures */}
        {error && domains.length > 0 && (
          <p className="text-xs text-amber-600">Предупреждение: {error}</p>
        )}
      </CardContent>
    </Card>
  )
}

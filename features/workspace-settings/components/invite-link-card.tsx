"use client"

import { Copy, Link as LinkIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"

import type { Role } from "@/types/roles"
import { ROLE_LABELS } from "@/types/roles"
import { useInviteLink } from "../hooks/use-workspace-settings"

const roles: Role[] = ["admin", "manager", "estimator", "viewer"]

export function InviteLinkCard() {
  const { enabled, url, defaultRole, loading, saving, error, updateInviteLink, refetch } = useInviteLink()

  // ── Loading skeleton ──
  if (loading) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-72" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-[140px]" />
        </CardContent>
      </Card>
    )
  }

  async function handleToggleEnabled(checked: boolean) {
    try {
      await updateInviteLink({ enabled: checked })
      toast.success(checked ? "Ссылка включена" : "Ссылка выключена")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Ошибка сохранения")
    }
  }

  async function handleRoleChange(newRole: string) {
    try {
      await updateInviteLink({ defaultRole: newRole })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Ошибка сохранения")
    }
  }

  function handleCopy() {
    if (url) {
      navigator.clipboard.writeText(url).then(
        () => toast.success("Ссылка скопирована"),
        () => toast.error("Не удалось скопировать ссылку")
      )
    }
  }

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <LinkIcon className="size-4" />
              Пригласительная ссылка
            </CardTitle>
            <CardDescription>
              Позволяет пользователям присоединяться по ссылке без ручного
              приглашения.
            </CardDescription>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggleEnabled}
            disabled={saving}
          />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="invite-link" className="text-xs">
            Ссылка
          </Label>
          <Input
            id="invite-link"
            value={enabled ? (url ?? "—") : "Ссылка отключена"}
            readOnly
            className="h-8 text-xs font-mono"
          />
        </div>
        <div className="flex items-end">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            disabled={!enabled || !url}
            onClick={handleCopy}
          >
            <Copy className="size-3.5" />
            Копировать
          </Button>
        </div>
        <div className="space-y-1.5 sm:w-[140px]">
          <Label htmlFor="invite-default-role" className="text-xs">
            Роль по умолчанию
          </Label>
          <Select
            value={defaultRole}
            onValueChange={handleRoleChange}
            disabled={saving || !enabled}
          >
            <SelectTrigger id="invite-default-role" className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      {error && (
        <div className="px-6 pb-4">
          <p className="text-xs text-destructive">
            Ошибка: {error}{" "}
            <button onClick={refetch} className="underline">Повторить</button>
          </p>
        </div>
      )}
    </Card>
  )
}

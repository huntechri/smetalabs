"use client"

import { useState } from "react"
import { Copy, Link as LinkIcon } from "@phosphor-icons/react"

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
import { Switch } from "@/components/ui/switch"

import { ROLE_LABELS } from "../types"
import type { WorkspaceRole } from "../types"

const roles: WorkspaceRole[] = ["admin", "manager", "estimator", "viewer"]

export function InviteLinkCard() {
  const [enabled, setEnabled] = useState(true)

  const inviteUrl = "https://app.smetalabs.ru/join/smetalabs-studio"

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
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="invite-link" className="text-xs">
            Ссылка
          </Label>
          <Input
            id="invite-link"
            value={inviteUrl}
            readOnly
            className="h-8 text-xs font-mono"
          />
        </div>
        <div className="flex items-end">
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={() => {
              navigator.clipboard.writeText(inviteUrl).catch(() => {})
            }}
          >
            <Copy className="size-3.5" />
            Копировать
          </Button>
        </div>
        <div className="space-y-1.5 sm:w-[140px]">
          <Label htmlFor="invite-default-role" className="text-xs">
            Роль по умолчанию
          </Label>
          <Select defaultValue="viewer">
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
    </Card>
  )
}

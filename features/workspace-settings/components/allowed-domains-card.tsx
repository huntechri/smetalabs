"use client"

import { useState } from "react"
import { Globe, Plus, X } from "@phosphor-icons/react"

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
import { Switch } from "@/components/ui/switch"

import { allowedDomains } from "../__mocks__/workspace-settings"

export function AllowedDomainsCard() {
  const [autoJoin, setAutoJoin] = useState(false)
  const [newDomain, setNewDomain] = useState("")
  const [domains, setDomains] = useState(
    allowedDomains.map((d) => d.domain)
  )

  function handleAdd() {
    const trimmed = newDomain.trim().toLowerCase()
    if (trimmed && !domains.includes(trimmed)) {
      setDomains((prev) => [...prev, trimmed])
      setNewDomain("")
    }
  }

  function handleRemove(domain: string) {
    setDomains((prev) => prev.filter((d) => d !== domain))
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
          {domains.map((domain) => (
            <Badge
              key={domain}
              variant="secondary"
              className="gap-1 pr-1 font-mono text-xs font-normal"
            >
              @{domain}
              <Button
                variant="ghost"
                size="sm"
                className="size-4 p-0 hover:bg-transparent"
                onClick={() => handleRemove(domain)}
              >
                <X className="size-2.5" />
              </Button>
            </Badge>
          ))}
          {domains.length === 0 && (
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
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 shrink-0"
            onClick={handleAdd}
            disabled={!newDomain.trim()}
          >
            <Plus className="size-3.5" />
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
            onCheckedChange={setAutoJoin}
          />
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { PaperPlaneTilt } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Textarea } from "@/components/ui/textarea"

import type { Role } from "@/types/roles"
import { ROLE_LABELS } from "@/types/roles"

const roles: Role[] = ["admin", "manager", "estimator", "viewer"]

export function InviteMemberCard() {
  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PaperPlaneTilt className="size-4" />
          Пригласить участника
        </CardTitle>
        <CardDescription>
          Отправьте приглашение на email. Пользователь получит ссылку для
          регистрации.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="invite-email" className="text-xs">
            Email
          </Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="user@company.ru"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-role" className="text-xs">
            Роль
          </Label>
          <Select defaultValue="viewer">
            <SelectTrigger id="invite-role" className="h-8 text-xs">
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
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="invite-message" className="text-xs">
            Сообщение (необязательно)
          </Label>
          <Textarea
            id="invite-message"
            placeholder="Привет! Приглашаю тебя присоединиться к workspace..."
            className="min-h-[80px] text-xs resize-none"
          />
        </div>
      </CardContent>
      <CardFooter className="border-t border-dashed border-border/50 pt-4">
        <Button size="sm" className="gap-1.5">
          <PaperPlaneTilt className="size-3.5" />
          Отправить приглашение
        </Button>
      </CardFooter>
    </Card>
  )
}

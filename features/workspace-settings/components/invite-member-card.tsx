"use client"

import { useState } from "react"
import { PaperPlaneTilt, Spinner } from "@phosphor-icons/react"
import { toast } from "sonner"

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
import { useInviteMember } from "../hooks/use-workspace-settings"

const roles: Role[] = ["admin", "manager", "estimator", "viewer"]

export function InviteMemberCard() {
  const { invite, loading, error, emailWarning } = useInviteMember()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("viewer")
  const [message, setMessage] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)
    setWarning(null)

    if (!email.trim()) {
      setLocalError("Введите email")
      return
    }

    try {
      await invite(email.trim(), role, message.trim() || undefined)
      toast.success(`Приглашение отправлено на ${email.trim()}`)
      // Проверяем предупреждение от хука (email не ушёл, но сохранён)
      // setTimeout чтобы хук успел обновить emailWarning после await
      setTimeout(() => {
        if (emailWarning) {
          setWarning(emailWarning)
          toast.warning(emailWarning)
        }
      }, 100)
      setEmail("")
      setRole("viewer")
      setMessage("")
    } catch (err: any) {
      const msg = err?.message ?? "Ошибка отправки приглашения"
      setLocalError(msg)
      toast.error(msg)
    }
  }

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
      <form onSubmit={handleSubmit}>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role" className="text-xs">
              Роль
            </Label>
            <Select
              value={role}
              onValueChange={setRole}
              disabled={loading}
            >
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
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
            />
          </div>
          {localError && (
            <p className="sm:col-span-2 text-xs text-destructive">{localError}</p>
          )}
          {warning && (
            <p className="sm:col-span-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
              ⚠️ {warning}
            </p>
          )}
        </CardContent>
        <CardFooter className="border-t border-dashed border-border/50 pt-4">
          <Button type="submit" size="sm" className="gap-1.5" disabled={loading}>
            {loading ? (
              <Spinner className="size-3.5 animate-spin" />
            ) : (
              <PaperPlaneTilt className="size-3.5" />
            )}
            {loading ? "Отправка..." : "Отправить приглашение"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

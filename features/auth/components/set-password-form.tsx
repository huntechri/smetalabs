"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

export function SetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов")
      return
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают")
      return
    }

    setIsPending(true)

    const { error } = await supabase.auth.updateUser({ password })

    setIsPending(false)

    if (error) {
      setError(
        "Не удалось сохранить пароль. Откройте ссылку из приглашения ещё раз или запросите новое приглашение."
      )
      return
    }

    router.replace("/dashboard")
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Придумайте пароль</h1>
                <p className="text-balance text-muted-foreground">
                  Установите пароль для входа в SmetaLab после принятия
                  приглашения.
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="password">Пароль</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <FieldDescription>Минимум 8 символов.</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Повторите пароль
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </Field>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Field>
                <Button type="submit" className="gap-2" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Spinner className="size-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    "Сохранить пароль"
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        После сохранения пароля вы будете перенаправлены в рабочую область.
      </FieldDescription>
    </div>
  )
}

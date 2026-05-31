"use client"

import { useState } from "react"
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
import { useInvitePassword } from "../application/use-invite-password"

export function InvitePasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { submitInvitePassword, error, isPending } = useInvitePassword()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitInvitePassword(password, confirmPassword)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="p-6 md:p-8">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Придумайте пароль</h1>
                <p className="text-balance text-muted-foreground">
                  Установите или обновите пароль для входа в SmetaLab.
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

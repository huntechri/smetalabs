"use client"

import { useActionState } from "react"
import { Spinner } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { AuthIllustration } from "./auth-illustration"
import {
  forgotPasswordAction,
  type ForgotPasswordState,
} from "@/lib/auth/actions"

const initialState: ForgotPasswordState = {}

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    initialState
  )

  if (state.success) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="flex flex-col items-center gap-4 p-6 md:p-8">
            <h1 className="text-2xl font-bold">Проверьте почту</h1>
            <p className="text-center text-muted-foreground">
              Мы отправили ссылку для сброса пароля на{" "}
              <strong>{state.email}</strong>. Перейдите по ссылке в письме.
            </p>
            <Button asChild variant="outline">
              <Link href="/login">Вернуться ко входу</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form action={formAction} className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Восстановление пароля</h1>
                <p className="text-balance text-muted-foreground">
                  Укажите email, и мы отправим ссылку для сброса пароля.
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="user@company.ru"
                  required
                  defaultValue={state.email}
                />
              </Field>
              {state.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              <Field>
                <Button type="submit" className="gap-2" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Spinner className="size-4 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    "Отправить ссылку"
                  )}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Вспомнили пароль?{" "}
                <Link href="/login" className="underline underline-offset-4">
                  Войти
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <AuthIllustration />
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Продолжая, вы соглашаетесь с{" "}
        <a href="#">условиями использования</a> и{" "}
        <a href="#">политикой конфиденциальности</a>.
      </FieldDescription>
    </div>
  )
}

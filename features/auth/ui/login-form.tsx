"use client"

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
import { useLogin } from "../application/use-login"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { state, formAction, isPending } = useLogin()

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form action={formAction} className="p-6 md:p-8">
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">С возвращением</h1>
                <p className="text-balance text-muted-foreground">
                  Войдите в аккаунт SmetaLab
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
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Пароль</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Забыли пароль?
                  </Link>
                </div>
                <Input id="password" name="password" type="password" required />
              </Field>
              {state.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              <Field>
                <Button type="submit" className="gap-2" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Spinner className="size-4 animate-spin" />
                      Вход...
                    </>
                  ) : (
                    "Войти"
                  )}
                </Button>
              </Field>
              <FieldDescription className="text-center text-muted-foreground">
                Социальный вход пока не подключён. Используйте email и пароль.
              </FieldDescription>
              <FieldDescription className="text-center">
                Нет аккаунта?{" "}
                <Link href="/signup" className="underline underline-offset-4">
                  Зарегистрироваться
                </Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <AuthIllustration />
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Продолжая, вы соглашаетесь с <a href="#">условиями использования</a> и{" "}
        <a href="#">политикой конфиденциальности</a>.
      </FieldDescription>
    </div>
  )
}

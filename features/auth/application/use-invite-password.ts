"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  validatePasswords,
  isAlreadySaved,
  hasInvitationMetadata,
  getInvitePasswordErrorMessage,
} from "../model/auth-model"

export function useInvitePassword() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const submitInvitePassword = async (password: string, confirmPassword: string) => {
    setError(null)

    const validationError = validatePasswords(password, confirmPassword)
    if (validationError) {
      setError(validationError)
      return false
    }

    setIsPending(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError && !isAlreadySaved(updateError)) {
        setIsPending(false)
        setError(getInvitePasswordErrorMessage(updateError))
        return false
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setIsPending(false)
        setError(
          "Пароль сохранён, но не удалось проверить сессию. Войдите с новым паролем."
        )
        return false
      }

      if (!hasInvitationMetadata(user.user_metadata)) {
        setIsPending(false)
        router.replace("/dashboard")
        return true
      }

      const acceptResponse = await fetch("/api/team/invitations/accept", {
        method: "POST",
      })

      setIsPending(false)

      if (!acceptResponse.ok) {
        setError(
          "Пароль сохранён, но приглашение не удалось принять. Обратитесь к администратору workspace."
        )
        return false
      }

      router.replace("/dashboard")
      return true
    } catch (err) {
      setIsPending(false)
      setError(err instanceof Error ? err.message : "Произошла неизвестная ошибка")
      return false
    }
  }

  return {
    submitInvitePassword,
    error,
    isPending,
  }
}

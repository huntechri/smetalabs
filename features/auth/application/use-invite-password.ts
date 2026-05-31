"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  acceptTeamInvitation,
  getCurrentUserInvitationMetadata,
  updateCurrentUserCredential,
} from "../api/auth-client"
import {
  validatePasswords,
  isAlreadySaved,
  hasInvitationMetadata,
  getInvitePasswordErrorMessage,
} from "../model/auth-model"

export function useInvitePassword() {
  const router = useRouter()
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
      const updateError = await updateCurrentUserCredential(password)

      if (updateError && !isAlreadySaved(updateError)) {
        setIsPending(false)
        setError(getInvitePasswordErrorMessage(updateError))
        return false
      }

      const { metadata, error: userError, hasUser } =
        await getCurrentUserInvitationMetadata()

      if (userError || !hasUser) {
        setIsPending(false)
        setError(
          "Пароль сохранён, но не удалось проверить сессию. Войдите с новым паролем."
        )
        return false
      }

      if (!hasInvitationMetadata(metadata)) {
        setIsPending(false)
        router.replace("/dashboard")
        return true
      }

      const invitationAccepted = await acceptTeamInvitation()

      setIsPending(false)

      if (!invitationAccepted) {
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

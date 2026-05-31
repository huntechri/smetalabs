"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { updateCurrentUserCredential } from "../api/auth-client"
import { validatePasswords } from "../model/auth-model"

export function useSetPassword() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const submitSetPassword = async (password: string, confirmPassword: string) => {
    setError(null)

    const validationError = validatePasswords(password, confirmPassword)
    if (validationError) {
      setError(validationError)
      return false
    }

    setIsPending(true)

    try {
      const updateError = await updateCurrentUserCredential(password)

      setIsPending(false)

      if (updateError) {
        setError(
          "Не удалось сохранить пароль. Откройте ссылку из приглашения ещё раз или запросите новое приглашение."
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
    submitSetPassword,
    error,
    isPending,
  }
}

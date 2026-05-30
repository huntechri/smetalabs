"use client"

import { useMutation } from "@tanstack/react-query"
import {
  revokeOtherSessionsAction,
  sendOwnPasswordResetEmailAction,
} from "@/app/actions/settings"
import { toast } from "sonner"

export function useResetPassword() {
  const mutation = useMutation({
    mutationFn: sendOwnPasswordResetEmailAction,
    onSuccess: (result) => {
      toast.success(result.message ?? "Ссылка для сброса пароля отправлена")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "Ошибка отправки ссылки для сброса пароля"
      )
    },
  })

  return {
    resetPassword: async () => {
      return mutation.mutateAsync()
    },
    loading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}

export function useRevokeOtherSessions() {
  const mutation = useMutation({
    mutationFn: revokeOtherSessionsAction,
    onSuccess: (result) => {
      toast.success(result.message ?? "Другие сессии завершены")
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Ошибка завершения других сессий"
      )
    },
  })

  return {
    revokeOtherSessions: async () => {
      return mutation.mutateAsync()
    },
    loading: mutation.isPending,
    error: mutation.error?.message ?? null,
  }
}

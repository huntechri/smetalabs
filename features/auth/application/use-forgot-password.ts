"use client"

import { useActionState } from "react"
import { forgotPasswordAction, type ForgotPasswordState } from "@/lib/auth/actions"

const initialState: ForgotPasswordState = {}

export function useForgotPassword() {
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, initialState)
  return {
    state,
    formAction,
    isPending,
  }
}

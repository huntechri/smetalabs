"use client"

import { useActionState } from "react"
import { loginAction, type LoginState } from "@/lib/auth/actions"

const initialState: LoginState = {}

export function useLogin() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)
  return {
    state,
    formAction,
    isPending,
  }
}

"use client"

import { useActionState } from "react"
import { signupAction, type SignupState } from "@/lib/auth/actions"

const initialState: SignupState = {}

export function useSignup() {
  const [state, formAction, isPending] = useActionState(signupAction, initialState)
  return {
    state,
    formAction,
    isPending,
  }
}

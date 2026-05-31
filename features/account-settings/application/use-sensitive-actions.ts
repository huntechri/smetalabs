"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  deactivateAccountAction,
  deleteWorkspaceAction,
  leaveWorkspaceAction,
  transferWorkspaceOwnershipAction,
} from "@/app/actions/settings"
import { createClient } from "@/lib/supabase/client"
import { settingsQueryKeys } from "../api/settings-query-keys"
import { toast } from "sonner"

export function useLeaveWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: leaveWorkspaceAction,
    onSuccess: async (result) => {
      toast.success(result.message)
      await queryClient.invalidateQueries({ queryKey: settingsQueryKeys.all })
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Ошибка выхода из workspace"
      )
    },
  })
}

export function useTransferOwnership() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ targetUserId }: { targetUserId: string }) =>
      transferWorkspaceOwnershipAction({ targetUserId }),
    onSuccess: async (result) => {
      toast.success(result.message)
      await queryClient.invalidateQueries({ queryKey: settingsQueryKeys.all })
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "Ошибка передачи прав владельца"
      )
    },
  })
}

export function useDeactivateAccount() {
  return useMutation({
    mutationFn: deactivateAccountAction,
    onSuccess: async (result) => {
      toast.success(result.message)
      const supabase = createClient()
      await supabase.auth.signOut()
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Ошибка деактивации аккаунта"
      )
    },
  })
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ confirmation }: { confirmation: string }) =>
      deleteWorkspaceAction({ confirmation }),
    onSuccess: async (result) => {
      toast.success(result.message)
      await queryClient.invalidateQueries({ queryKey: settingsQueryKeys.all })
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Ошибка удаления workspace"
      )
    },
  })
}

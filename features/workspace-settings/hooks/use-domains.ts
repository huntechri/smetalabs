"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createWorkspaceDomain,
  deleteWorkspaceDomain,
  fetchWorkspaceDomains,
  updateWorkspaceAutoJoinDomains,
} from "../api/team-client"
import { teamQueryKeys } from "../api/team-query-keys"

export function useDomains() {
  const queryClient = useQueryClient()
  const domainsQuery = useQuery({
    queryKey: teamQueryKeys.domains(),
    queryFn: fetchWorkspaceDomains,
  })
  const invalidateDomains = () =>
    queryClient.invalidateQueries({ queryKey: teamQueryKeys.domains() })

  const addDomainMutation = useMutation({
    mutationFn: createWorkspaceDomain,
    onSuccess: invalidateDomains,
  })
  const removeDomainMutation = useMutation({
    mutationFn: deleteWorkspaceDomain,
    onSuccess: invalidateDomains,
  })
  const autoJoinMutation = useMutation({
    mutationFn: updateWorkspaceAutoJoinDomains,
    onSuccess: invalidateDomains,
  })

  return {
    domains: domainsQuery.data?.domains ?? [],
    autoJoin: domainsQuery.data?.autoJoin ?? false,
    loading: domainsQuery.isLoading,
    error:
      domainsQuery.error?.message ??
      addDomainMutation.error?.message ??
      removeDomainMutation.error?.message ??
      autoJoinMutation.error?.message ??
      null,
    refetch: async () => {
      await domainsQuery.refetch()
    },
    addDomain: async (domain: string) => {
      try {
        await addDomainMutation.mutateAsync(domain)
        return true
      } catch {
        return false
      }
    },
    removeDomain: async (id: string) => {
      try {
        await removeDomainMutation.mutateAsync(id)
        return true
      } catch {
        return false
      }
    },
    setAutoJoinDomains: async (value: boolean) => {
      try {
        await autoJoinMutation.mutateAsync(value)
        return true
      } catch {
        return false
      }
    },
  }
}

"use client"

import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createProjectEstimateRecord,
  deleteProjectEstimateRecord,
  fetchProjectEstimateRecords,
  updateProjectEstimateRecord,
} from "@/features/projects/api/project-estimate-records-client"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"
import type { ProjectEstimateRecordMutationInput } from "@/types/project-estimate-record"

const ESTIMATE_RECORDS_STALE_TIME_MS = 30_000
const ESTIMATE_RECORDS_GC_TIME_MS = 5 * 60_000

export function useProjectEstimateRecords(projectId: string) {
  const queryClient = useQueryClient()
  const params = useMemo(() => ({ limit: 50, cursor: 0 }), [])

  const estimateRecordsQuery = useQuery({
    queryKey: projectsQueryKeys.estimateRecordsList(projectId, params),
    queryFn: () => fetchProjectEstimateRecords({ projectId, params }),
    staleTime: ESTIMATE_RECORDS_STALE_TIME_MS,
    gcTime: ESTIMATE_RECORDS_GC_TIME_MS,
    refetchOnWindowFocus: true,
  })

  const invalidateEstimateRecords = async () => {
    await queryClient.invalidateQueries({
      queryKey: projectsQueryKeys.estimateRecords(projectId),
    })
  }

  const createMutation = useMutation({
    mutationFn: (input: ProjectEstimateRecordMutationInput) =>
      createProjectEstimateRecord({ projectId, input }),
    onSuccess: invalidateEstimateRecords,
  })

  const updateMutation = useMutation({
    mutationFn: ({
      recordId,
      input,
    }: {
      recordId: string
      input: ProjectEstimateRecordMutationInput
    }) => updateProjectEstimateRecord({ projectId, recordId, input }),
    onSuccess: invalidateEstimateRecords,
  })

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) => deleteProjectEstimateRecord({ projectId, recordId }),
    onSuccess: invalidateEstimateRecords,
  })

  return {
    records: estimateRecordsQuery.data?.data ?? [],
    meta: estimateRecordsQuery.data?.meta ?? null,
    loading: estimateRecordsQuery.isLoading,
    isFetching: estimateRecordsQuery.isFetching,
    error:
      estimateRecordsQuery.error?.message ??
      createMutation.error?.message ??
      updateMutation.error?.message ??
      deleteMutation.error?.message ??
      null,
    saving: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    refetch: async () => {
      await estimateRecordsQuery.refetch()
    },
    createRecord: async (input: ProjectEstimateRecordMutationInput) => {
      const response = await createMutation.mutateAsync(input)
      return response.data
    },
    updateRecord: async (recordId: string, input: ProjectEstimateRecordMutationInput) => {
      const response = await updateMutation.mutateAsync({ recordId, input })
      return response.data
    },
    deleteRecord: async (recordId: string) => {
      const response = await deleteMutation.mutateAsync(recordId)
      return response.data
    },
  }
}

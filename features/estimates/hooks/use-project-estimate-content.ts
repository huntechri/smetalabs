"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  applyProjectEstimateContentChange,
  applyProjectEstimateWorkCoefficient,
  fetchProjectEstimateContent,
  type EstimateContentChangeInput,
} from "@/features/estimates/api/project-estimate-content-client"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"

const ESTIMATE_CONTENT_STALE_TIME_MS = 15_000
const ESTIMATE_CONTENT_GC_TIME_MS = 5 * 60_000

export function useProjectEstimateContent(projectId: string, recordId: string) {
  const queryClient = useQueryClient()

  const contentQuery = useQuery({
    queryKey: projectsQueryKeys.estimateRecordContent(projectId, recordId),
    queryFn: () => fetchProjectEstimateContent({ projectId, recordId }),
    staleTime: ESTIMATE_CONTENT_STALE_TIME_MS,
    gcTime: ESTIMATE_CONTENT_GC_TIME_MS,
    refetchOnWindowFocus: true,
  })

  const updateContentCache = async (response: Awaited<ReturnType<typeof fetchProjectEstimateContent>>) => {
    queryClient.setQueryData(
      projectsQueryKeys.estimateRecordContent(projectId, recordId),
      response
    )
    await queryClient.invalidateQueries({
      queryKey: projectsQueryKeys.estimateRecords(projectId),
    })
  }

  const changeMutation = useMutation({
    mutationFn: (input: EstimateContentChangeInput) =>
      applyProjectEstimateContentChange({ projectId, recordId, input }),
    onSuccess: updateContentCache,
  })

  const coefficientMutation = useMutation({
    mutationFn: (coefficientPercent: number) =>
      applyProjectEstimateWorkCoefficient({ projectId, recordId, coefficientPercent }),
    onSuccess: updateContentCache,
  })

  return {
    content: contentQuery.data?.data ?? null,
    loading: contentQuery.isLoading,
    isFetching: contentQuery.isFetching,
    error:
      contentQuery.error?.message ??
      changeMutation.error?.message ??
      coefficientMutation.error?.message ??
      null,
    saving: changeMutation.isPending || coefficientMutation.isPending,
    refetch: async () => {
      await contentQuery.refetch()
    },
    applyChange: async (input: EstimateContentChangeInput) => {
      const response = await changeMutation.mutateAsync(input)
      return response.data
    },
    applyWorkCoefficient: async (coefficientPercent: number) => {
      const response = await coefficientMutation.mutateAsync(coefficientPercent)
      return response.data
    },
  }
}

"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  applyProjectEstimateContentChange,
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

  const changeMutation = useMutation({
    mutationFn: (input: EstimateContentChangeInput) =>
      applyProjectEstimateContentChange({ projectId, recordId, input }),
    onSuccess: async (response) => {
      queryClient.setQueryData(
        projectsQueryKeys.estimateRecordContent(projectId, recordId),
        response
      )
      await queryClient.invalidateQueries({
        queryKey: projectsQueryKeys.estimateRecords(projectId),
      })
    },
  })

  return {
    content: contentQuery.data?.data ?? null,
    loading: contentQuery.isLoading,
    isFetching: contentQuery.isFetching,
    error:
      contentQuery.error?.message ??
      changeMutation.error?.message ??
      null,
    saving: changeMutation.isPending,
    refetch: async () => {
      await contentQuery.refetch()
    },
    applyChange: async (input: EstimateContentChangeInput) => {
      const response = await changeMutation.mutateAsync(input)
      return response.data
    },
  }
}

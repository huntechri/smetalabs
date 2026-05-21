"use client"

import { useState, useCallback } from "react"
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

function extractItemIds(input: EstimateContentChangeInput): string[] {
  switch (input.action) {
    case "archive_section":
      return [input.payload.sectionId]
    case "reorder_sections":
      return input.payload.items.map((item) => item.id)
    case "archive_work":
      return [input.payload.workId]
    case "reorder_works":
      return input.payload.items.map((item) => item.id)
    case "update_work":
      return [input.payload.workId]
    case "add_work_from_directory":
      return [input.payload.sectionId]
    case "archive_material":
      return [input.payload.materialId]
    case "reorder_materials":
      return input.payload.items.map((item) => item.id)
    case "update_material":
      return [input.payload.materialId]
    case "add_material_from_directory":
      return [input.payload.workId]
    default:
      return []
  }
}

export function useProjectEstimateContent(projectId: string, recordId: string) {
  const queryClient = useQueryClient()
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  const contentQuery = useQuery({
    queryKey: projectsQueryKeys.estimateRecordContent(projectId, recordId),
    queryFn: () => fetchProjectEstimateContent({ projectId, recordId }),
    staleTime: ESTIMATE_CONTENT_STALE_TIME_MS,
    gcTime: ESTIMATE_CONTENT_GC_TIME_MS,
    refetchOnWindowFocus: true,
  })

  const updateContentCache = useCallback(
    async (response: Awaited<ReturnType<typeof fetchProjectEstimateContent>>) => {
      queryClient.setQueryData(
        projectsQueryKeys.estimateRecordContent(projectId, recordId),
        response,
      )
      await queryClient.invalidateQueries({
        queryKey: projectsQueryKeys.estimateRecords(projectId),
      })
    },
    [projectId, queryClient, recordId],
  )

  const changeMutation = useMutation({
    mutationFn: (input: EstimateContentChangeInput) =>
      applyProjectEstimateContentChange({ projectId, recordId, input }),
    onMutate: (input) => {
      const ids = extractItemIds(input)
      if (ids.length > 0) {
        setSavingIds((prev) => {
          const next = new Set(prev)
          for (const id of ids) next.add(id)
          return next
        })
      }
    },
    onSettled: () => {
      setSavingIds((prev) => (prev.size > 0 ? new Set() : prev))
    },
    onSuccess: updateContentCache,
  })

  const coefficientMutation = useMutation({
    mutationFn: (coefficientPercent: number) =>
      applyProjectEstimateWorkCoefficient({ projectId, recordId, coefficientPercent }),
    onMutate: () => {
      setSavingIds((prev) => new Set(prev).add("__coefficient__"))
    },
    onSettled: () => {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete("__coefficient__")
        return next
      })
    },
    onSuccess: updateContentCache,
  })

  const isSaving = changeMutation.isPending || coefficientMutation.isPending

  return {
    content: contentQuery.data?.data ?? null,
    loading: contentQuery.isLoading,
    isFetching: contentQuery.isFetching,
    error:
      contentQuery.error?.message ??
      changeMutation.error?.message ??
      coefficientMutation.error?.message ??
      null,
    saving: isSaving,
    savingIds,
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

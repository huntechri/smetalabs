"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  applyProjectEstimateContentChange,
  applyProjectEstimateWorkCoefficient,
  fetchProjectEstimateContent,
  type EstimateContentChangeInput,
} from "@/features/estimates/api/project-estimate-content-client"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"
import type {
  ProjectEstimateContentResponse,
  ProjectEstimateContentSection,
} from "@/types/project-estimate-content"
import { applyOptimisticChange } from "@/features/estimates/estimate-details/lib/optimistic-update"

const ESTIMATE_CONTENT_STALE_TIME_MS = 15_000
const ESTIMATE_CONTENT_GC_TIME_MS = 5 * 60_000

function extractItemIds(input: EstimateContentChangeInput): string[] {
  switch (input.action) {
    case "archive_section":
      return [input.payload.sectionId]
    case "update_section":
      return [input.payload.sectionId]
    case "reorder_sections":
      return input.payload.items.map((item) => item.id)
    case "archive_work":
      return [input.payload.workId]
    case "update_work":
      return [input.payload.workId]
    case "move_work_to_section":
      return [input.payload.workId]
    case "add_work_from_directory":
      return [input.payload.sectionId]
    case "add_manual_work":
      return [input.payload.sectionId]
    case "archive_material":
      return [input.payload.materialId]
    case "update_material":
      return [input.payload.materialId]
    case "move_material_to_work":
      return [input.payload.materialId]
    case "add_material_from_directory":
      return [input.payload.workId]
    case "add_manual_material":
      return [input.payload.workId]
    case "reorder_works":
      return input.payload.items.map((item) => item.id)
    case "create_section":
      return []
    default: {
      const _exhaustive: never = input
      void _exhaustive
      return []
    }
  }
}

export function useProjectEstimateContent(projectId: string, recordId: string) {
  const queryClient = useQueryClient()
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const sectionsRef = useRef<ProjectEstimateContentSection[] | null>(null)
  const optimisticSnapshotRef = useRef<ProjectEstimateContentResponse | null>(
    null
  )

  const contentKey = projectsQueryKeys.estimateRecordContent(
    projectId,
    recordId
  )

  const contentQuery = useQuery({
    queryKey: contentKey,
    queryFn: () => fetchProjectEstimateContent({ projectId, recordId }),
    staleTime: ESTIMATE_CONTENT_STALE_TIME_MS,
    gcTime: ESTIMATE_CONTENT_GC_TIME_MS,
    refetchOnWindowFocus: true,
  })

  const updateContentCache = useCallback(
    async (
      response: Awaited<ReturnType<typeof fetchProjectEstimateContent>> & {
        _partial?: boolean
      }
    ) => {
      // Helper to strip _optimistic flag from sections (used for temp→real ID replacement)
      const stripOptimisticSections = (
        sections: ProjectEstimateContentSection[]
      ): ProjectEstimateContentSection[] =>
        sections.filter((s) => !(s as Record<string, unknown>)._optimistic)

      // Opt 1: If this is a partial response (single section update), merge it
      // into the cached data instead of replacing the entire cache.
      if (response._partial) {
        const cached =
          queryClient.getQueryData<
            Awaited<ReturnType<typeof fetchProjectEstimateContent>>
          >(contentKey)

        if (cached?.data?.sections && response.data?.sections?.[0]) {
          const updatedSection = response.data.sections[0]

          // Strip any _optimistic sections from cache — they will be replaced
          // by the real section from the server response (e.g. create_section)
          const cleanSections = stripOptimisticSections(cached.data.sections)

          const mergedSections = cleanSections.map((s) =>
            s.id === updatedSection.id ? updatedSection : s
          )

          // If the section is new (not in cache), append it
          const hasSection = cleanSections.some(
            (s) => s.id === updatedSection.id
          )
          if (!hasSection) {
            mergedSections.push(updatedSection)
          }

          // Recompute summary from merged sections
          const summary = mergedSections.reduce(
            (acc, section) => ({
              worksAmount:
                Math.round((acc.worksAmount + section.worksAmount) * 100) / 100,
              materialsAmount:
                Math.round(
                  (acc.materialsAmount + section.materialsAmount) * 100
                ) / 100,
              totalAmount:
                Math.round((acc.totalAmount + section.totalAmount) * 100) / 100,
            }),
            { worksAmount: 0, materialsAmount: 0, totalAmount: 0 }
          )

          queryClient.setQueryData(contentKey, {
            ...response,
            _partial: undefined,
            data: {
              record: response.data.record,
              sections: mergedSections,
              summary,
            },
          })
        } else {
          // No cache yet, store as-is
          queryClient.setQueryData(contentKey, response)
        }
      } else {
        queryClient.setQueryData(contentKey, response)
      }

      await queryClient.invalidateQueries({
        queryKey: projectsQueryKeys.estimateRecords(projectId),
      })
      await queryClient.invalidateQueries({
        queryKey: projectsQueryKeys.detail(projectId),
      })
      await queryClient.invalidateQueries({
        queryKey: projectsQueryKeys.lists(),
      })
    },
    [contentKey, queryClient, projectId]
  )

  const changeMutation = useMutation({
    mutationFn: (input: EstimateContentChangeInput) =>
      applyProjectEstimateContentChange({ projectId, recordId, input }),
    onMutate: async (input) => {
      // 1. Cancel outgoing queries for update/move actions to prevent
      //    a stale refetch from overwriting the optimistic update.
      //    Insert/delete/reorder don't need this — the new item or removal
      //    is immediately visible and any refetch would just confirm it.
      const needsCancel =
        input.action === "update_work" ||
        input.action === "update_material" ||
        input.action === "update_section" ||
        input.action === "move_work_to_section" ||
        input.action === "move_material_to_work"

      if (needsCancel) {
        await queryClient.cancelQueries({ queryKey: contentKey })
      }

      // 2. Save snapshot for rollback
      const previous =
        queryClient.getQueryData<ProjectEstimateContentResponse>(contentKey)
      optimisticSnapshotRef.current = previous ?? null

      // 3. Optimistically update the cache
      const optimistic = applyOptimisticChange(previous?.data, input)
      if (optimistic) {
        queryClient.setQueryData(contentKey, {
          ...previous,
          data: optimistic,
        } as ProjectEstimateContentResponse)
      }

      // 4. Track saving IDs for per-item loading indicators
      const ids = extractItemIds(input)
      if (ids.length > 0) {
        setSavingIds((prev) => {
          const next = new Set(prev)
          for (const id of ids) next.add(id)
          return next
        })
      }

      return { previous, ids }
    },
    onError: (_err, _input, context) => {
      // Rollback to previous state on error
      if (context?.previous) {
        queryClient.setQueryData(contentKey, context.previous)
      }
    },
    onSettled: (_data, _error, _vars, context) => {
      if (context?.ids?.length) {
        setSavingIds((prev) => {
          const next = new Set(prev)
          for (const id of context.ids) next.delete(id)
          return next
        })
      }
      // Don't invalidate — targeted re-read already updates cache via onSuccess
    },
    onSuccess: (response) => {
      if (response._duplicate) {
        // Rollback optimistic temp item on duplicate
        if (optimisticSnapshotRef.current) {
          queryClient.setQueryData(contentKey, optimisticSnapshotRef.current)
        }
        return
      }
      updateContentCache(response)
    },
  })

  const coefficientMutation = useMutation({
    mutationFn: (coefficientPercent: number) =>
      applyProjectEstimateWorkCoefficient({
        projectId,
        recordId,
        coefficientPercent,
      }),
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
    onSuccess: (response) => {
      updateContentCache(response)
    },
  })

  const content = contentQuery.data?.data ?? null

  // Keep sectionsRef in sync so ensureSection can read it without a content dependency
  useEffect(() => {
    if (content?.sections) {
      sectionsRef.current = content.sections
    }
  }, [content?.sections])

  const getSections = useCallback(() => sectionsRef.current, [])

  const isSaving = changeMutation.isPending || coefficientMutation.isPending

  const mutationError =
    changeMutation.error?.message ?? coefficientMutation.error?.message ?? null

  const clearMutationError = useCallback(() => {
    changeMutation.reset()
    coefficientMutation.reset()
  }, [changeMutation, coefficientMutation])

  return {
    content,
    loading: contentQuery.isLoading,
    isFetching: contentQuery.isFetching,
    loadError: contentQuery.error?.message ?? null,
    mutationError,
    clearMutationError,
    saving: isSaving,
    savingIds,
    getSections,
    refetch: async () => {
      changeMutation.reset()
      coefficientMutation.reset()
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

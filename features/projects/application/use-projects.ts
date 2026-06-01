"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archiveProject,
  createProject,
  fetchProjects,
  updateProject,
} from "@/features/projects/api/projects-client"
import { projectsQueryKeys } from "@/features/projects/api/projects-query-keys"
import type {
  ProjectMutationInput,
  ProjectStatus,
  ProjectsListParams,
} from "@/types/project"
import { getProjectsListParams } from "../model/projects-model"

const PROJECTS_STALE_TIME_MS = 30_000
const PROJECTS_GC_TIME_MS = 5 * 60_000

export function useProjects() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useMemo(() => getProjectsListParams(searchParams), [searchParams])

  const projectsQuery = useQuery({
    queryKey: projectsQueryKeys.list(params),
    queryFn: () => fetchProjects(params),
    staleTime: PROJECTS_STALE_TIME_MS,
    gcTime: PROJECTS_GC_TIME_MS,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  })

  const updateUrlParams = (next: Partial<ProjectsListParams>) => {
    const urlParams = new URLSearchParams(searchParams.toString())

    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "" || value === "all") {
        urlParams.delete(key)
      } else {
        urlParams.set(key, String(value))
      }
    }

    if ("q" in next || "status" in next || "sort" in next) {
      urlParams.delete("cursor")
    }

    const query = urlParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const invalidateProjects = async () => {
    await queryClient.invalidateQueries({ queryKey: projectsQueryKeys.all })
  }

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (response) => {
      await invalidateProjects()
      await queryClient.invalidateQueries({
        queryKey: projectsQueryKeys.detail(response.data.id),
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateProject,
    onSuccess: async (response) => {
      await invalidateProjects()
      await queryClient.invalidateQueries({
        queryKey: projectsQueryKeys.detail(response.data.id),
      })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: archiveProject,
    onSuccess: async (response) => {
      await invalidateProjects()
      await queryClient.invalidateQueries({
        queryKey: projectsQueryKeys.detail(response.data.id),
      })
    },
  })

  return {
    projects: projectsQuery.data?.data ?? [],
    meta: projectsQuery.data?.meta ?? null,
    params,
    search: params.q ?? "",
    statusFilter: params.status ?? "all",
    loading: projectsQuery.isLoading,
    isFetching: projectsQuery.isFetching,
    error:
      projectsQuery.error?.message ??
      createMutation.error?.message ??
      updateMutation.error?.message ??
      archiveMutation.error?.message ??
      null,
    saving:
      createMutation.isPending ||
      updateMutation.isPending ||
      archiveMutation.isPending,
    setSearch: (q: string) => updateUrlParams({ q: q.trim() || undefined }),
    setStatusFilter: (status: ProjectStatus | "all") =>
      updateUrlParams({ status }),
    setCursor: (cursor: number) => updateUrlParams({ cursor }),
    refetch: async () => {
      await projectsQuery.refetch()
    },
    createProject: async (input: ProjectMutationInput) => {
      const response = await createMutation.mutateAsync(input)
      return response.data
    },
    updateProject: async (id: string, input: ProjectMutationInput) => {
      const response = await updateMutation.mutateAsync({ id, input })
      return response.data
    },
    archiveProject: async (id: string) => {
      const response = await archiveMutation.mutateAsync(id)
      return response.data
    },
  }
}

import { createHash } from "node:crypto"
import { revalidateTag, unstable_cache } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaceRole, requireCurrentWorkspace } from "@/lib/auth/team"
import { ProjectsApiError } from "../api/projects-errors"
import { projectsCacheTags } from "../api/projects-query-keys"
import type { ProjectMutationInput, ProjectsListParams } from "@/types/project"
import {
  archiveProjectForWorkspace,
  createProjectForWorkspace,
  getProjectForWorkspace,
  listProjectsForWorkspace,
  updateProjectForWorkspace,
  getProjectDashboardStatsForWorkspace,
  getWorkspaceDashboardStatsForWorkspace,
} from "./projects.repository"
import { normalizeProjectsListParams } from "./projects.schemas"

type ProjectsContext = {
  userId: string
  workspaceOwnerId: string
  cacheTags: {
    list: string
    detail: (projectId: string) => string
  }
}

const WRITE_ROLES = new Set(["owner", "admin", "manager"])
const LIST_CACHE_REVALIDATE_SECONDS = 30
const DETAIL_CACHE_REVALIDATE_SECONDS = 120

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

export async function requireProjectsReadContext(): Promise<ProjectsContext> {
  const client = await createClient()
  const { data, error } = await client.auth.getUser()

  if (error || !data.user) {
    throw new ProjectsApiError("UNAUTHORIZED", "Требуется аутентификация", 401)
  }

  try {
    const workspaceOwnerId = await requireCurrentWorkspace(data.user.id)
    return {
      userId: data.user.id,
      workspaceOwnerId,
      cacheTags: {
        list: projectsCacheTags.list(workspaceOwnerId),
        detail: (projectId: string) =>
          projectsCacheTags.detail(workspaceOwnerId, projectId),
      },
    }
  } catch (err) {
    if (err instanceof Error && err.message === "WORKSPACE_MEMBER_REQUIRED") {
      throw new ProjectsApiError("FORBIDDEN", "Нет доступа к workspace", 403)
    }
    throw err
  }
}

export async function requireProjectsWriteContext(): Promise<ProjectsContext> {
  const context = await requireProjectsReadContext()
  const role = await getWorkspaceRole(context.userId, context.workspaceOwnerId)

  if (!role || !WRITE_ROLES.has(role)) {
    throw new ProjectsApiError(
      "FORBIDDEN",
      "Недостаточно прав для изменения проектов",
      403
    )
  }

  return context
}

function revalidateProjectTags(context: ProjectsContext, projectId?: string) {
  revalidateTag(context.cacheTags.list, "max")
  if (projectId) revalidateTag(context.cacheTags.detail(projectId), "max")
}

export async function listProjects(params: ProjectsListParams) {
  const context = await requireProjectsReadContext()
  const normalizedParams = normalizeProjectsListParams(params)
  const cacheKey = stableHash({
    workspaceOwnerId: context.workspaceOwnerId,
    normalizedParams,
  })

  return unstable_cache(
    () => listProjectsForWorkspace(context.workspaceOwnerId, normalizedParams),
    ["projects:list", cacheKey],
    {
      revalidate: LIST_CACHE_REVALIDATE_SECONDS,
      tags: [context.cacheTags.list],
    }
  )()
}

export async function getProject(id: string) {
  const context = await requireProjectsReadContext()
  const project = await unstable_cache(
    () => getProjectForWorkspace(context.workspaceOwnerId, id),
    ["projects:detail", context.workspaceOwnerId, id],
    {
      revalidate: DETAIL_CACHE_REVALIDATE_SECONDS,
      tags: [context.cacheTags.detail(id), context.cacheTags.list],
    }
  )()

  if (!project) throw new ProjectsApiError("NOT_FOUND", "Проект не найден", 404)
  return {
    data: project,
    meta: { cacheTag: context.cacheTags.detail(project.id) },
  }
}

export async function createProject(input: ProjectMutationInput) {
  const context = await requireProjectsWriteContext()
  const project = await createProjectForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    input
  )

  revalidateProjectTags(context, project.id)
  return { data: project }
}

export async function updateProject(id: string, input: ProjectMutationInput) {
  const context = await requireProjectsWriteContext()
  const project = await updateProjectForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    id,
    input
  )

  revalidateProjectTags(context, project.id)
  return { data: project }
}

export async function archiveProject(id: string) {
  const context = await requireProjectsWriteContext()
  const project = await archiveProjectForWorkspace(
    context.workspaceOwnerId,
    context.userId,
    id
  )

  revalidateProjectTags(context, project.id)
  return { data: project }
}

export async function getProjectDashboardStats(id: string) {
  const context = await requireProjectsReadContext()
  const stats = await getProjectDashboardStatsForWorkspace(context.workspaceOwnerId, id)
  return { data: stats }
}

export async function getWorkspaceDashboardStats() {
  const context = await requireProjectsReadContext()
  const stats = await getWorkspaceDashboardStatsForWorkspace(context.workspaceOwnerId)
  return { data: stats }
}


import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { ProjectsApiError } from "../api/projects-errors"
import {
  archiveProject,
  createProject,
  getProject,
  listProjects,
  updateProject,
  getProjectDashboardStats,
} from "./projects.service"
import {
  parseProjectId,
  parseProjectMutationBody,
  parseProjectsListParams,
} from "./projects.schemas"

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

function getZodMessage(error: ZodError) {
  return error.issues[0]?.message ?? "Некорректные параметры запроса"
}

async function readJsonBody(request: NextRequest) {
  try {
    return await request.json()
  } catch {
    throw new ProjectsApiError("BAD_REQUEST", "Некорректное тело запроса", 400)
  }
}

export function handleProjectsRouteError(err: unknown, routeLabel: string) {
  if (err instanceof ProjectsApiError)
    return jsonError(err.code, err.message, err.status)
  if (err instanceof ZodError)
    return jsonError("BAD_REQUEST", getZodMessage(err), 400)

  console.error(routeLabel, err)
  return jsonError("INTERNAL_ERROR", "Ошибка раздела проектов", 500)
}

export async function handleProjectsListRequest(request: NextRequest) {
  try {
    const params = parseProjectsListParams(request.nextUrl.searchParams)
    const response = await listProjects(params)
    return NextResponse.json(response)
  } catch (err) {
    return handleProjectsRouteError(err, "[GET /api/projects]")
  }
}

export async function handleProjectCreateRequest(request: NextRequest) {
  try {
    const body = await readJsonBody(request)
    const input = parseProjectMutationBody(body)
    const response = await createProject(input)
    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    return handleProjectsRouteError(err, "[POST /api/projects]")
  }
}

export async function handleProjectDetailRequest(id: string) {
  try {
    const projectId = parseProjectId(id)
    const response = await getProject(projectId)
    return NextResponse.json(response)
  } catch (err) {
    return handleProjectsRouteError(err, "[GET /api/projects/[id]]")
  }
}

export async function handleProjectUpdateRequest(
  request: NextRequest,
  id: string
) {
  try {
    const projectId = parseProjectId(id)
    const body = await readJsonBody(request)
    const input = parseProjectMutationBody(body)
    const response = await updateProject(projectId, input)
    return NextResponse.json(response)
  } catch (err) {
    return handleProjectsRouteError(err, "[PATCH /api/projects/[id]]")
  }
}

export async function handleProjectArchiveRequest(id: string) {
  try {
    const projectId = parseProjectId(id)
    const response = await archiveProject(projectId)
    return NextResponse.json(response)
  } catch (err) {
    return handleProjectsRouteError(err, "[DELETE /api/projects/[id]]")
  }
}

export async function handleProjectDashboardStatsRequest(id: string) {
  try {
    const projectId = parseProjectId(id)
    const response = await getProjectDashboardStats(projectId)
    return NextResponse.json(response)
  } catch (err) {
    return handleProjectsRouteError(
      err,
      "[GET /api/projects/[id]/dashboard-stats]"
    )
  }
}

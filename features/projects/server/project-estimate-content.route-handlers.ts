import { NextRequest, NextResponse } from "next/server"
import { ProjectsApiError } from "../api/projects-errors"
import { handleProjectsRouteError } from "./projects.route-handlers"
import {
  applyProjectEstimateContentChange,
  getProjectEstimateContent,
  listProjectEstimateMaterialOptions,
  listProjectEstimateWorkOptions,
} from "./project-estimate-content.service"
import {
  parseEstimateContentChangeBody,
  parseEstimateContentOptionsParams,
  parseEstimateContentProjectId,
  parseEstimateContentRecordId,
} from "./project-estimate-content.schemas"

async function readJsonBody(request: NextRequest) {
  try {
    return await request.json()
  } catch {
    throw new ProjectsApiError("BAD_REQUEST", "Некорректное тело запроса", 400)
  }
}

export async function handleProjectEstimateContentRequest(
  projectIdParam: string,
  recordIdParam: string
) {
  try {
    const projectId = parseEstimateContentProjectId(projectIdParam)
    const recordId = parseEstimateContentRecordId(recordIdParam)
    const response = await getProjectEstimateContent(projectId, recordId)
    return NextResponse.json(response)
  } catch (err) {
    return handleProjectsRouteError(err, "[GET /api/projects/[id]/estimate-records/[recordId]/content]")
  }
}

export async function handleProjectEstimateContentChangeRequest(
  request: NextRequest,
  projectIdParam: string,
  recordIdParam: string
) {
  try {
    const projectId = parseEstimateContentProjectId(projectIdParam)
    const recordId = parseEstimateContentRecordId(recordIdParam)
    const body = await readJsonBody(request)
    const input = parseEstimateContentChangeBody(body)
    const response = await applyProjectEstimateContentChange(projectId, recordId, input)
    return NextResponse.json(response)
  } catch (err) {
    return handleProjectsRouteError(err, "[POST /api/projects/[id]/estimate-records/[recordId]/changes]")
  }
}

export async function handleProjectEstimateWorkOptionsRequest(
  request: NextRequest,
  projectIdParam: string,
  recordIdParam: string
) {
  try {
    const projectId = parseEstimateContentProjectId(projectIdParam)
    const recordId = parseEstimateContentRecordId(recordIdParam)
    const params = parseEstimateContentOptionsParams(request.nextUrl.searchParams)
    const response = await listProjectEstimateWorkOptions(projectId, recordId, params)
    return NextResponse.json(response)
  } catch (err) {
    return handleProjectsRouteError(err, "[GET /api/projects/[id]/estimate-records/[recordId]/work-options]")
  }
}

export async function handleProjectEstimateMaterialOptionsRequest(
  request: NextRequest,
  projectIdParam: string,
  recordIdParam: string
) {
  try {
    const projectId = parseEstimateContentProjectId(projectIdParam)
    const recordId = parseEstimateContentRecordId(recordIdParam)
    const params = parseEstimateContentOptionsParams(request.nextUrl.searchParams)
    const response = await listProjectEstimateMaterialOptions(projectId, recordId, params)
    return NextResponse.json(response)
  } catch (err) {
    return handleProjectsRouteError(err, "[GET /api/projects/[id]/estimate-records/[recordId]/material-options]")
  }
}

import { NextRequest, NextResponse } from "next/server"
import { ProjectsApiError } from "../api/projects-errors"
import { handleProjectsRouteError } from "./projects.route-handlers"
import {
  createProjectEstimateRecord,
  listProjectEstimateRecords,
  updateProjectEstimateRecord,
} from "./project-estimate-records.service"
import {
  parseEstimateRecordId,
  parseProjectEstimateRecordMutationBody,
  parseProjectEstimateRecordsListParams,
  parseProjectId,
} from "./project-estimate-records.schemas"

async function readJsonBody(request: NextRequest) {
  try {
    return await request.json()
  } catch {
    throw new ProjectsApiError("BAD_REQUEST", "Некорректное тело запроса", 400)
  }
}

export async function handleProjectEstimateRecordsListRequest(
  request: NextRequest,
  projectIdParam: string
) {
  try {
    const projectId = parseProjectId(projectIdParam)
    const params = parseProjectEstimateRecordsListParams(request.nextUrl.searchParams)
    const response = await listProjectEstimateRecords(projectId, params)
    return NextResponse.json(response)
  } catch (err) {
    return handleProjectsRouteError(err, "[GET /api/projects/[id]/estimate-records]")
  }
}

export async function handleProjectEstimateRecordCreateRequest(
  request: NextRequest,
  projectIdParam: string
) {
  try {
    const projectId = parseProjectId(projectIdParam)
    const body = await readJsonBody(request)
    const input = parseProjectEstimateRecordMutationBody(body)
    const response = await createProjectEstimateRecord(projectId, input)
    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    return handleProjectsRouteError(err, "[POST /api/projects/[id]/estimate-records]")
  }
}

export async function handleProjectEstimateRecordUpdateRequest(
  request: NextRequest,
  projectIdParam: string,
  recordIdParam: string
) {
  try {
    const projectId = parseProjectId(projectIdParam)
    const recordId = parseEstimateRecordId(recordIdParam)
    const body = await readJsonBody(request)
    const input = parseProjectEstimateRecordMutationBody(body)
    const response = await updateProjectEstimateRecord(projectId, recordId, input)
    return NextResponse.json(response)
  } catch (err) {
    return handleProjectsRouteError(err, "[PATCH /api/projects/[id]/estimate-records/[recordId]]")
  }
}

import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { DirectoryWorksApiError } from "../api/directory-works-errors"
import {
  archiveDirectoryWork,
  createDirectoryWork,
  getDirectoryWork,
  getDirectoryWorksCategories,
  listDirectoryWorks,
  updateDirectoryWork,
} from "./directory-works.service"
import {
  parseDirectoryWorkCategoryStatus,
  parseDirectoryWorkId,
  parseDirectoryWorkMutationBody,
  parseDirectoryWorksListParams,
} from "./directory-works.schemas"

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
    throw new DirectoryWorksApiError(
      "BAD_REQUEST",
      "Некорректное тело запроса",
      400
    )
  }
}

export function handleDirectoryWorksRouteError(
  err: unknown,
  routeLabel: string
) {
  if (err instanceof DirectoryWorksApiError) {
    return jsonError(err.code, err.message, err.status)
  }

  if (err instanceof ZodError) {
    return jsonError("BAD_REQUEST", getZodMessage(err), 400)
  }

  console.error(routeLabel, err)
  return jsonError("INTERNAL_ERROR", "Ошибка справочника работ", 500)
}

export async function handleDirectoryWorksListRequest(request: NextRequest) {
  try {
    const params = parseDirectoryWorksListParams(request.nextUrl.searchParams)
    const response = await listDirectoryWorks(params)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryWorksRouteError(err, "[GET /api/directory-works]")
  }
}

export async function handleDirectoryWorkCreateRequest(request: NextRequest) {
  try {
    const body = await readJsonBody(request)
    const input = parseDirectoryWorkMutationBody(body)
    const response = await createDirectoryWork(input)
    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    return handleDirectoryWorksRouteError(err, "[POST /api/directory-works]")
  }
}

export async function handleDirectoryWorkDetailRequest(id: string) {
  try {
    const workId = parseDirectoryWorkId(id)
    const response = await getDirectoryWork(workId)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryWorksRouteError(
      err,
      "[GET /api/directory-works/[id]]"
    )
  }
}

export async function handleDirectoryWorkUpdateRequest(
  request: NextRequest,
  id: string
) {
  try {
    const workId = parseDirectoryWorkId(id)
    const body = await readJsonBody(request)
    const input = parseDirectoryWorkMutationBody(body)
    const response = await updateDirectoryWork(workId, input)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryWorksRouteError(
      err,
      "[PATCH /api/directory-works/[id]]"
    )
  }
}

export async function handleDirectoryWorkArchiveRequest(id: string) {
  try {
    const workId = parseDirectoryWorkId(id)
    const response = await archiveDirectoryWork(workId)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryWorksRouteError(
      err,
      "[DELETE /api/directory-works/[id]]"
    )
  }
}

export async function handleDirectoryWorksCategoriesRequest(request: NextRequest) {
  try {
    const status = parseDirectoryWorkCategoryStatus(
      request.nextUrl.searchParams.get("status")
    )
    const response = await getDirectoryWorksCategories(status)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryWorksRouteError(
      err,
      "[GET /api/directory-works/categories]"
    )
  }
}

import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { DirectoryWorksApiError } from "../api/directory-works-errors"
import {
  aiSearchDirectoryWorks,
  appendDirectoryWorkImportBatch,
  applyDirectoryWorkImportJob,
  archiveDirectoryWork,
  createDirectoryWork,
  createDirectoryWorkImportJob,
  exportDirectoryWorks,
  getDirectoryWork,
  getDirectoryWorkImportJob,
  getDirectoryWorksCategories,
  listDirectoryWorks,
  processDirectoryWorkEmbeddings,
  updateDirectoryWork,
} from "./directory-works.service"
import {
  parseDirectoryWorkAiSearchBody,
  parseDirectoryWorkCategoryStatus,
  parseDirectoryWorkEmbeddingProcessBody,
  parseDirectoryWorkId,
  parseDirectoryWorkImportApplyBody,
  parseDirectoryWorkImportBatchBody,
  parseDirectoryWorkImportCreateBody,
  parseDirectoryWorkMutationBody,
  parseDirectoryWorksExportParams,
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

async function readOptionalJsonBody(request: NextRequest) {
  const text = await request.text()
  if (!text.trim()) return {}

  try {
    return JSON.parse(text)
  } catch {
    throw new DirectoryWorksApiError(
      "BAD_REQUEST",
      "Некорректное тело запроса",
      400
    )
  }
}

function toResponseBody(body: string | Buffer): BodyInit {
  if (typeof body === "string") return body

  const bytes = new Uint8Array(body.byteLength)
  bytes.set(body)
  return new Blob([bytes.buffer])
}

export function handleDirectoryWorksRouteError(
  err: unknown,
  routeLabel: string
) {
  if (err instanceof DirectoryWorksApiError)
    return jsonError(err.code, err.message, err.status)
  if (err instanceof ZodError)
    return jsonError("BAD_REQUEST", getZodMessage(err), 400)

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

export async function handleDirectoryWorksCategoriesRequest(
  request: NextRequest
) {
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

export async function handleDirectoryWorkImportCreateRequest(
  request: NextRequest
) {
  try {
    const body = await readJsonBody(request)
    const input = parseDirectoryWorkImportCreateBody(body)
    const response = await createDirectoryWorkImportJob(input)
    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    return handleDirectoryWorksRouteError(
      err,
      "[POST /api/directory-works/import-jobs]"
    )
  }
}

export async function handleDirectoryWorkImportDetailRequest(id: string) {
  try {
    const jobId = parseDirectoryWorkId(id)
    const response = await getDirectoryWorkImportJob(jobId)
    return NextResponse.json({ data: response })
  } catch (err) {
    return handleDirectoryWorksRouteError(
      err,
      "[GET /api/directory-works/import-jobs/[id]]"
    )
  }
}

export async function handleDirectoryWorkImportBatchRequest(
  request: NextRequest,
  id: string
) {
  try {
    const jobId = parseDirectoryWorkId(id)
    const body = await readJsonBody(request)
    const input = parseDirectoryWorkImportBatchBody(body)
    const response = await appendDirectoryWorkImportBatch(jobId, input)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryWorksRouteError(
      err,
      "[POST /api/directory-works/import-jobs/[id]/batches]"
    )
  }
}

export async function handleDirectoryWorkImportApplyRequest(
  request: NextRequest,
  id: string
) {
  try {
    const jobId = parseDirectoryWorkId(id)
    const body = await readOptionalJsonBody(request)
    const input = parseDirectoryWorkImportApplyBody(body)
    const response = await applyDirectoryWorkImportJob(jobId, input)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryWorksRouteError(
      err,
      "[POST /api/directory-works/import-jobs/[id]/apply]"
    )
  }
}

export async function handleDirectoryWorksExportRequest(request: NextRequest) {
  try {
    const { format, params } = parseDirectoryWorksExportParams(
      request.nextUrl.searchParams
    )
    const file = await exportDirectoryWorks(format, params)
    const date = new Date().toISOString().slice(0, 10)

    return new NextResponse(toResponseBody(file.body), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="directory-works-${date}.${file.extension}"`,
        "Content-Type": file.contentType,
      },
    })
  } catch (err) {
    return handleDirectoryWorksRouteError(
      err,
      "[GET /api/directory-works/export]"
    )
  }
}

export async function handleDirectoryWorksAiSearchRequest(
  request: NextRequest
) {
  try {
    const body = await readJsonBody(request)
    const input = parseDirectoryWorkAiSearchBody(body)
    const response = await aiSearchDirectoryWorks(input)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryWorksRouteError(
      err,
      "[POST /api/directory-works/ai-search]"
    )
  }
}

export async function handleDirectoryWorkEmbeddingsProcessRequest(
  request: NextRequest
) {
  try {
    const body = await readJsonBody(request)
    const input = parseDirectoryWorkEmbeddingProcessBody(body)
    const response = await processDirectoryWorkEmbeddings(input.limit)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryWorksRouteError(
      err,
      "[POST /api/directory-works/embeddings/process]"
    )
  }
}

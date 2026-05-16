import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { DirectoryMaterialsApiError } from "../api/directory-materials-errors"
import {
  appendDirectoryMaterialImportBatch,
  applyDirectoryMaterialImportJob,
  archiveDirectoryMaterial,
  createDirectoryMaterial,
  createDirectoryMaterialImportJob,
  exportDirectoryMaterials,
  getDirectoryMaterial,
  getDirectoryMaterialImportJob,
  getDirectoryMaterialsCategories,
  listDirectoryMaterials,
  updateDirectoryMaterial,
} from "./directory-materials.service"
import {
  parseDirectoryMaterialCategoryStatus,
  parseDirectoryMaterialId,
  parseDirectoryMaterialImportApplyBody,
  parseDirectoryMaterialImportBatchBody,
  parseDirectoryMaterialImportCreateBody,
  parseDirectoryMaterialMutationBody,
  parseDirectoryMaterialsExportParams,
  parseDirectoryMaterialsListParams,
} from "./directory-materials.schemas"

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
    throw new DirectoryMaterialsApiError("BAD_REQUEST", "Некорректное тело запроса", 400)
  }
}

async function readOptionalJsonBody(request: NextRequest) {
  const text = await request.text()
  if (!text.trim()) return {}

  try {
    return JSON.parse(text)
  } catch {
    throw new DirectoryMaterialsApiError("BAD_REQUEST", "Некорректное тело запроса", 400)
  }
}

export function handleDirectoryMaterialsRouteError(err: unknown, routeLabel: string) {
  if (err instanceof DirectoryMaterialsApiError) return jsonError(err.code, err.message, err.status)
  if (err instanceof ZodError) return jsonError("BAD_REQUEST", getZodMessage(err), 400)

  console.error(routeLabel, err)
  return jsonError("INTERNAL_ERROR", "Ошибка справочника материалов", 500)
}

export async function handleDirectoryMaterialsListRequest(request: NextRequest) {
  try {
    const params = parseDirectoryMaterialsListParams(request.nextUrl.searchParams)
    const response = await listDirectoryMaterials(params)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryMaterialsRouteError(err, "[GET /api/directory-materials]")
  }
}

export async function handleDirectoryMaterialCreateRequest(request: NextRequest) {
  try {
    const body = await readJsonBody(request)
    const input = parseDirectoryMaterialMutationBody(body)
    const response = await createDirectoryMaterial(input)
    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    return handleDirectoryMaterialsRouteError(err, "[POST /api/directory-materials]")
  }
}

export async function handleDirectoryMaterialDetailRequest(id: string) {
  try {
    const materialId = parseDirectoryMaterialId(id)
    const response = await getDirectoryMaterial(materialId)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryMaterialsRouteError(err, "[GET /api/directory-materials/[id]]")
  }
}

export async function handleDirectoryMaterialUpdateRequest(request: NextRequest, id: string) {
  try {
    const materialId = parseDirectoryMaterialId(id)
    const body = await readJsonBody(request)
    const input = parseDirectoryMaterialMutationBody(body)
    const response = await updateDirectoryMaterial(materialId, input)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryMaterialsRouteError(err, "[PATCH /api/directory-materials/[id]]")
  }
}

export async function handleDirectoryMaterialArchiveRequest(id: string) {
  try {
    const materialId = parseDirectoryMaterialId(id)
    const response = await archiveDirectoryMaterial(materialId)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryMaterialsRouteError(err, "[DELETE /api/directory-materials/[id]]")
  }
}

export async function handleDirectoryMaterialsCategoriesRequest(request: NextRequest) {
  try {
    const status = parseDirectoryMaterialCategoryStatus(request.nextUrl.searchParams.get("status"))
    const response = await getDirectoryMaterialsCategories(status)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryMaterialsRouteError(err, "[GET /api/directory-materials/categories]")
  }
}

export async function handleDirectoryMaterialImportCreateRequest(request: NextRequest) {
  try {
    const body = await readJsonBody(request)
    const input = parseDirectoryMaterialImportCreateBody(body)
    const response = await createDirectoryMaterialImportJob(input)
    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    return handleDirectoryMaterialsRouteError(err, "[POST /api/directory-materials/import-jobs]")
  }
}

export async function handleDirectoryMaterialImportDetailRequest(id: string) {
  try {
    const jobId = parseDirectoryMaterialId(id)
    const response = await getDirectoryMaterialImportJob(jobId)
    return NextResponse.json({ data: response })
  } catch (err) {
    return handleDirectoryMaterialsRouteError(err, "[GET /api/directory-materials/import-jobs/[id]]")
  }
}

export async function handleDirectoryMaterialImportBatchRequest(request: NextRequest, id: string) {
  try {
    const jobId = parseDirectoryMaterialId(id)
    const body = await readJsonBody(request)
    const input = parseDirectoryMaterialImportBatchBody(body)
    const response = await appendDirectoryMaterialImportBatch(jobId, input)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryMaterialsRouteError(err, "[POST /api/directory-materials/import-jobs/[id]/batches]")
  }
}

export async function handleDirectoryMaterialImportApplyRequest(request: NextRequest, id: string) {
  try {
    const jobId = parseDirectoryMaterialId(id)
    const body = await readOptionalJsonBody(request)
    const input = parseDirectoryMaterialImportApplyBody(body)
    const response = await applyDirectoryMaterialImportJob(jobId, input)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryMaterialsRouteError(err, "[POST /api/directory-materials/import-jobs/[id]/apply]")
  }
}

export async function handleDirectoryMaterialsExportRequest(request: NextRequest) {
  try {
    const { format, params } = parseDirectoryMaterialsExportParams(request.nextUrl.searchParams)
    const file = await exportDirectoryMaterials(format, params)
    const date = new Date().toISOString().slice(0, 10)

    return new NextResponse(file.body, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="directory-materials-${date}.${file.extension}"`,
        "Content-Type": file.contentType,
      },
    })
  } catch (err) {
    return handleDirectoryMaterialsRouteError(err, "[GET /api/directory-materials/export]")
  }
}

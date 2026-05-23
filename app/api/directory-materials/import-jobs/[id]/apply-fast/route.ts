import { revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { DirectoryMaterialsApiError } from "@/features/directory-materials/api/directory-materials-errors"
import { directoryMaterialsCacheTags } from "@/features/directory-materials/api/directory-materials-query-keys"
import { applyFastDirectoryMaterialImportBatchForWorkspace } from "@/features/directory-materials/server/directory-materials-fast-import.repository"
import {
  parseDirectoryMaterialId,
  parseDirectoryMaterialImportApplyBody,
} from "@/features/directory-materials/server/directory-materials.schemas"
import { requireDirectoryMaterialsWriteContext } from "@/features/directory-materials/server/directory-materials.service"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

async function readOptionalJsonBody(request: NextRequest) {
  const text = await request.text()
  if (!text.trim()) return {}

  try {
    return JSON.parse(text)
  } catch {
    throw new DirectoryMaterialsApiError(
      "BAD_REQUEST",
      "Некорректное тело запроса",
      400
    )
  }
}

function handleError(err: unknown) {
  if (err instanceof DirectoryMaterialsApiError)
    return jsonError(err.code, err.message, err.status)
  if (err instanceof ZodError)
    return jsonError(
      "BAD_REQUEST",
      err.issues[0]?.message ?? "Некорректные параметры запроса",
      400
    )

  console.error(
    "[POST /api/directory-materials/import-jobs/[id]/apply-fast]",
    err
  )
  return jsonError(
    "INTERNAL_ERROR",
    "Ошибка быстрого применения импорта материалов",
    500
  )
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params
    const jobId = parseDirectoryMaterialId(id)
    const body = await readOptionalJsonBody(request)
    const input = parseDirectoryMaterialImportApplyBody(body)
    const context = await requireDirectoryMaterialsWriteContext()
    const response = await applyFastDirectoryMaterialImportBatchForWorkspace(
      context.workspaceOwnerId,
      context.userId,
      jobId,
      input
    )

    revalidateTag(
      directoryMaterialsCacheTags.list(context.workspaceOwnerId),
      "max"
    )
    revalidateTag(
      directoryMaterialsCacheTags.categories(context.workspaceOwnerId),
      "max"
    )
    revalidateTag(
      directoryMaterialsCacheTags.importJob(
        context.workspaceOwnerId,
        response.data.job.id
      ),
      "max"
    )
    revalidateTag(
      directoryMaterialsCacheTags.aiSearchIndex(context.workspaceOwnerId),
      "max"
    )

    return NextResponse.json(response)
  } catch (err) {
    return handleError(err)
  }
}

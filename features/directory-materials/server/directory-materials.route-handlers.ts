import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { DirectoryMaterialsApiError } from "../api/directory-materials-errors"
import {
  createDirectoryMaterial,
  getDirectoryMaterial,
  getDirectoryMaterialsCategories,
  listDirectoryMaterials,
} from "./directory-materials.service"
import {
  parseDirectoryMaterialCategoryStatus,
  parseDirectoryMaterialId,
  parseDirectoryMaterialMutationBody,
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
    throw new DirectoryMaterialsApiError(
      "BAD_REQUEST",
      "Некорректное тело запроса",
      400
    )
  }
}

export function handleDirectoryMaterialsRouteError(
  err: unknown,
  routeLabel: string
) {
  if (err instanceof DirectoryMaterialsApiError) {
    return jsonError(err.code, err.message, err.status)
  }

  if (err instanceof ZodError) {
    return jsonError("BAD_REQUEST", getZodMessage(err), 400)
  }

  console.error(routeLabel, err)
  return jsonError("INTERNAL_ERROR", "Ошибка справочника материалов", 500)
}

export async function handleDirectoryMaterialsListRequest(request: NextRequest) {
  try {
    const params = parseDirectoryMaterialsListParams(request.nextUrl.searchParams)
    const response = await listDirectoryMaterials(params)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryMaterialsRouteError(
      err,
      "[GET /api/directory-materials]"
    )
  }
}

export async function handleDirectoryMaterialCreateRequest(request: NextRequest) {
  try {
    const body = await readJsonBody(request)
    const input = parseDirectoryMaterialMutationBody(body)
    const response = await createDirectoryMaterial(input)
    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    return handleDirectoryMaterialsRouteError(
      err,
      "[POST /api/directory-materials]"
    )
  }
}

export async function handleDirectoryMaterialDetailRequest(id: string) {
  try {
    const materialId = parseDirectoryMaterialId(id)
    const response = await getDirectoryMaterial(materialId)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryMaterialsRouteError(
      err,
      "[GET /api/directory-materials/[id]]"
    )
  }
}

export async function handleDirectoryMaterialsCategoriesRequest(
  request: NextRequest
) {
  try {
    const status = parseDirectoryMaterialCategoryStatus(
      request.nextUrl.searchParams.get("status")
    )
    const response = await getDirectoryMaterialsCategories(status)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryMaterialsRouteError(
      err,
      "[GET /api/directory-materials/categories]"
    )
  }
}

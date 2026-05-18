import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { DirectorySuppliersApiError } from "../api/directory-suppliers-errors"
import {
  archiveDirectorySupplier,
  createDirectorySupplier,
  getDirectorySupplier,
  listDirectorySuppliers,
  updateDirectorySupplier,
} from "./directory-suppliers.service"
import {
  parseDirectorySupplierId,
  parseDirectorySupplierMutationBody,
  parseDirectorySuppliersListParams,
} from "./directory-suppliers.schemas"

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
    throw new DirectorySuppliersApiError("BAD_REQUEST", "Некорректное тело запроса", 400)
  }
}

export function handleDirectorySuppliersRouteError(err: unknown, routeLabel: string) {
  if (err instanceof DirectorySuppliersApiError) return jsonError(err.code, err.message, err.status)
  if (err instanceof ZodError) return jsonError("BAD_REQUEST", getZodMessage(err), 400)

  console.error(routeLabel, err)
  return jsonError("INTERNAL_ERROR", "Ошибка справочника поставщиков", 500)
}

export async function handleDirectorySuppliersListRequest(request: NextRequest) {
  try {
    const params = parseDirectorySuppliersListParams(request.nextUrl.searchParams)
    const response = await listDirectorySuppliers(params)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectorySuppliersRouteError(err, "[GET /api/directory-suppliers]")
  }
}

export async function handleDirectorySupplierCreateRequest(request: NextRequest) {
  try {
    const body = await readJsonBody(request)
    const input = parseDirectorySupplierMutationBody(body)
    const response = await createDirectorySupplier(input)
    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    return handleDirectorySuppliersRouteError(err, "[POST /api/directory-suppliers]")
  }
}

export async function handleDirectorySupplierDetailRequest(id: string) {
  try {
    const supplierId = parseDirectorySupplierId(id)
    const response = await getDirectorySupplier(supplierId)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectorySuppliersRouteError(err, "[GET /api/directory-suppliers/[id]]")
  }
}

export async function handleDirectorySupplierUpdateRequest(request: NextRequest, id: string) {
  try {
    const supplierId = parseDirectorySupplierId(id)
    const body = await readJsonBody(request)
    const input = parseDirectorySupplierMutationBody(body)
    const response = await updateDirectorySupplier(supplierId, input)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectorySuppliersRouteError(err, "[PATCH /api/directory-suppliers/[id]]")
  }
}

export async function handleDirectorySupplierArchiveRequest(id: string) {
  try {
    const supplierId = parseDirectorySupplierId(id)
    const response = await archiveDirectorySupplier(supplierId)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectorySuppliersRouteError(err, "[DELETE /api/directory-suppliers/[id]]")
  }
}

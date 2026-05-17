import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { DirectoryCounterpartiesApiError } from "../api/directory-counterparties-errors"
import {
  archiveDirectoryCounterparty,
  createDirectoryCounterparty,
  getDirectoryCounterparty,
  listDirectoryCounterparties,
  updateDirectoryCounterparty,
} from "./directory-counterparties.service"
import {
  parseDirectoryCounterpartiesListParams,
  parseDirectoryCounterpartyId,
  parseDirectoryCounterpartyMutationBody,
} from "./directory-counterparties.schemas"

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
    throw new DirectoryCounterpartiesApiError("BAD_REQUEST", "Некорректное тело запроса", 400)
  }
}

export function handleDirectoryCounterpartiesRouteError(err: unknown, routeLabel: string) {
  if (err instanceof DirectoryCounterpartiesApiError) return jsonError(err.code, err.message, err.status)
  if (err instanceof ZodError) return jsonError("BAD_REQUEST", getZodMessage(err), 400)

  console.error(routeLabel, err)
  return jsonError("INTERNAL_ERROR", "Ошибка справочника контрагентов", 500)
}

export async function handleDirectoryCounterpartiesListRequest(request: NextRequest) {
  try {
    const params = parseDirectoryCounterpartiesListParams(request.nextUrl.searchParams)
    const response = await listDirectoryCounterparties(params)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryCounterpartiesRouteError(err, "[GET /api/directory-counterparties]")
  }
}

export async function handleDirectoryCounterpartyCreateRequest(request: NextRequest) {
  try {
    const body = await readJsonBody(request)
    const input = parseDirectoryCounterpartyMutationBody(body)
    const response = await createDirectoryCounterparty(input)
    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    return handleDirectoryCounterpartiesRouteError(err, "[POST /api/directory-counterparties]")
  }
}

export async function handleDirectoryCounterpartyDetailRequest(id: string) {
  try {
    const counterpartyId = parseDirectoryCounterpartyId(id)
    const response = await getDirectoryCounterparty(counterpartyId)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryCounterpartiesRouteError(err, "[GET /api/directory-counterparties/[id]]")
  }
}

export async function handleDirectoryCounterpartyUpdateRequest(request: NextRequest, id: string) {
  try {
    const counterpartyId = parseDirectoryCounterpartyId(id)
    const body = await readJsonBody(request)
    const input = parseDirectoryCounterpartyMutationBody(body)
    const response = await updateDirectoryCounterparty(counterpartyId, input)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryCounterpartiesRouteError(err, "[PATCH /api/directory-counterparties/[id]]")
  }
}

export async function handleDirectoryCounterpartyArchiveRequest(id: string) {
  try {
    const counterpartyId = parseDirectoryCounterpartyId(id)
    const response = await archiveDirectoryCounterparty(counterpartyId)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryCounterpartiesRouteError(err, "[DELETE /api/directory-counterparties/[id]]")
  }
}

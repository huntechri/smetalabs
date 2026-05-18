import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { GlobalPurchasesApiError } from "../api/global-purchases-errors"
import {
  archiveGlobalPurchase,
  createGlobalPurchase,
  getGlobalPurchase,
  listGlobalPurchases,
  searchGlobalPurchaseMaterialOptions,
  updateGlobalPurchase,
} from "./global-purchases.service"
import {
  parseGlobalPurchaseId,
  parseGlobalPurchaseMutationBody,
  parseGlobalPurchasesListParams,
} from "./global-purchases.schemas"

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
    throw new GlobalPurchasesApiError("BAD_REQUEST", "Некорректное тело запроса", 400)
  }
}

export function handleGlobalPurchasesRouteError(err: unknown, routeLabel: string) {
  if (err instanceof GlobalPurchasesApiError) return jsonError(err.code, err.message, err.status)
  if (err instanceof ZodError) return jsonError("BAD_REQUEST", getZodMessage(err), 400)

  console.error(routeLabel, err)
  return jsonError("INTERNAL_ERROR", "Ошибка раздела закупок", 500)
}

export async function handleGlobalPurchasesListRequest(request: NextRequest) {
  try {
    const params = parseGlobalPurchasesListParams(request.nextUrl.searchParams)
    const response = await listGlobalPurchases(params)
    return NextResponse.json(response)
  } catch (err) {
    return handleGlobalPurchasesRouteError(err, "[GET /api/global-purchases]")
  }
}

export async function handleGlobalPurchaseMaterialOptionsRequest(request: NextRequest) {
  try {
    const response = await searchGlobalPurchaseMaterialOptions(request.nextUrl.searchParams.get("q") ?? "")
    return NextResponse.json(response)
  } catch (err) {
    return handleGlobalPurchasesRouteError(err, "[GET /api/global-purchases/material-options]")
  }
}

export async function handleGlobalPurchaseCreateRequest(request: NextRequest) {
  try {
    const body = await readJsonBody(request)
    const input = parseGlobalPurchaseMutationBody(body)
    const response = await createGlobalPurchase(input)
    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    return handleGlobalPurchasesRouteError(err, "[POST /api/global-purchases]")
  }
}

export async function handleGlobalPurchaseDetailRequest(id: string) {
  try {
    const purchaseId = parseGlobalPurchaseId(id)
    const response = await getGlobalPurchase(purchaseId)
    return NextResponse.json(response)
  } catch (err) {
    return handleGlobalPurchasesRouteError(err, "[GET /api/global-purchases/[id]]")
  }
}

export async function handleGlobalPurchaseUpdateRequest(request: NextRequest, id: string) {
  try {
    const purchaseId = parseGlobalPurchaseId(id)
    const body = await readJsonBody(request)
    const input = parseGlobalPurchaseMutationBody(body)
    const response = await updateGlobalPurchase(purchaseId, input)
    return NextResponse.json(response)
  } catch (err) {
    return handleGlobalPurchasesRouteError(err, "[PATCH /api/global-purchases/[id]]")
  }
}

export async function handleGlobalPurchaseArchiveRequest(id: string) {
  try {
    const purchaseId = parseGlobalPurchaseId(id)
    const response = await archiveGlobalPurchase(purchaseId)
    return NextResponse.json(response)
  } catch (err) {
    return handleGlobalPurchasesRouteError(err, "[DELETE /api/global-purchases/[id]]")
  }
}

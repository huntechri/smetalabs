import { NextRequest } from "next/server"
import {
  handleGlobalPurchaseArchiveRequest,
  handleGlobalPurchaseDetailRequest,
  handleGlobalPurchaseUpdateRequest,
} from "@/features/global-purchases/server/global-purchases.route-handlers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleGlobalPurchaseDetailRequest(id)
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleGlobalPurchaseUpdateRequest(request, id)
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleGlobalPurchaseArchiveRequest(id)
}

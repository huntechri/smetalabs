import { NextRequest } from "next/server"
import {
  handleDirectoryCounterpartyArchiveRequest,
  handleDirectoryCounterpartyDetailRequest,
  handleDirectoryCounterpartyUpdateRequest,
} from "@/features/directory-counterparties/server/directory-counterparties.route-handlers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleDirectoryCounterpartyDetailRequest(id)
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleDirectoryCounterpartyUpdateRequest(request, id)
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleDirectoryCounterpartyArchiveRequest(id)
}

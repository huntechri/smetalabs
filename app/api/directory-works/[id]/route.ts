import { NextRequest } from "next/server"
import {
  handleDirectoryWorkArchiveRequest,
  handleDirectoryWorkDetailRequest,
  handleDirectoryWorkUpdateRequest,
} from "@/features/directory-works/server/directory-works.route-handlers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleDirectoryWorkDetailRequest(id)
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleDirectoryWorkUpdateRequest(request, id)
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleDirectoryWorkArchiveRequest(id)
}

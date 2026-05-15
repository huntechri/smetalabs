import { NextRequest } from "next/server"
import {
  handleDirectoryMaterialArchiveRequest,
  handleDirectoryMaterialDetailRequest,
  handleDirectoryMaterialUpdateRequest,
} from "@/features/directory-materials/server/directory-materials.route-handlers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleDirectoryMaterialDetailRequest(id)
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleDirectoryMaterialUpdateRequest(request, id)
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleDirectoryMaterialArchiveRequest(id)
}

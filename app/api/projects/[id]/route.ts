import { NextRequest } from "next/server"
import {
  handleProjectArchiveRequest,
  handleProjectDetailRequest,
  handleProjectUpdateRequest,
} from "@/features/projects/server/projects.route-handlers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleProjectDetailRequest(id)
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleProjectUpdateRequest(request, id)
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleProjectArchiveRequest(id)
}

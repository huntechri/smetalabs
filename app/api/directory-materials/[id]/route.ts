import { NextRequest } from "next/server"
import { handleDirectoryMaterialDetailRequest } from "@/features/directory-materials/server/directory-materials.route-handlers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleDirectoryMaterialDetailRequest(id)
}

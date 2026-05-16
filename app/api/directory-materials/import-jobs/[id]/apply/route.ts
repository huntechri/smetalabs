import { NextRequest } from "next/server"
import { handleDirectoryMaterialImportApplyRequest } from "@/features/directory-materials/server/directory-materials.route-handlers"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleDirectoryMaterialImportApplyRequest(request, id)
}

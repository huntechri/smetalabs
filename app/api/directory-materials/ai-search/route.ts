import { NextRequest, NextResponse } from "next/server"
import { handleDirectoryMaterialsRouteError } from "@/features/directory-materials/server/directory-materials.route-handlers"
import { parseDirectoryMaterialAiSearchBody } from "@/features/directory-materials/server/directory-materials.schemas"
import { searchDirectoryMaterialsAi } from "@/features/directory-materials/server/directory-materials.service"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = parseDirectoryMaterialAiSearchBody(body)
    const response = await searchDirectoryMaterialsAi(input)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryMaterialsRouteError(
      err,
      "[POST /api/directory-materials/ai-search]"
    )
  }
}

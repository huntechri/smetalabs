import { NextRequest, NextResponse } from "next/server"
import { handleDirectoryMaterialsRouteError } from "@/features/directory-materials/server/directory-materials.route-handlers"
import { parseDirectoryMaterialEmbeddingProcessBody } from "@/features/directory-materials/server/directory-materials.schemas"
import { processDirectoryMaterialEmbeddings } from "@/features/directory-materials/server/directory-materials.service"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const input = parseDirectoryMaterialEmbeddingProcessBody(body)
    const response = await processDirectoryMaterialEmbeddings(input)
    return NextResponse.json(response)
  } catch (err) {
    return handleDirectoryMaterialsRouteError(
      err,
      "[POST /api/directory-materials/embeddings/process]"
    )
  }
}

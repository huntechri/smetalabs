import { NextRequest } from "next/server"
import { handleDirectoryMaterialImportCreateRequest } from "@/features/directory-materials/server/directory-materials.route-handlers"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return handleDirectoryMaterialImportCreateRequest(request)
}

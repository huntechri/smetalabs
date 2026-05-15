import { NextRequest } from "next/server"
import { handleDirectoryMaterialsExportRequest } from "@/features/directory-materials/server/directory-materials.route-handlers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return handleDirectoryMaterialsExportRequest(request)
}

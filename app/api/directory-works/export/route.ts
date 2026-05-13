import { NextRequest } from "next/server"
import { handleDirectoryWorksExportRequest } from "@/features/directory-works/server/directory-works.route-handlers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return handleDirectoryWorksExportRequest(request)
}

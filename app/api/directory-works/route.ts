import { NextRequest } from "next/server"
import { handleDirectoryWorksListRequest } from "@/features/directory-works/server/directory-works.route-handlers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return handleDirectoryWorksListRequest(request)
}

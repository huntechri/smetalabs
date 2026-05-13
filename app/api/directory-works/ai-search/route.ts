import { NextRequest } from "next/server"
import { handleDirectoryWorksAiSearchRequest } from "@/features/directory-works/server/directory-works.route-handlers"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return handleDirectoryWorksAiSearchRequest(request)
}

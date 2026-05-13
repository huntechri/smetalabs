import { NextRequest } from "next/server"
import { handleDirectoryWorkImportCreateRequest } from "@/features/directory-works/server/directory-works.route-handlers"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return handleDirectoryWorkImportCreateRequest(request)
}

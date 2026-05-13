import { NextRequest } from "next/server"
import { handleDirectoryWorkEmbeddingsProcessRequest } from "@/features/directory-works/server/directory-works.route-handlers"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return handleDirectoryWorkEmbeddingsProcessRequest(request)
}

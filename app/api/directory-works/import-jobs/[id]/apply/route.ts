import { NextRequest } from "next/server"
import { handleDirectoryWorkImportApplyRequest } from "@/features/directory-works/server/directory-works.route-handlers"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleDirectoryWorkImportApplyRequest(id)
}

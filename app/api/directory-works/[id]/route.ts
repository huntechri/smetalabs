import { NextRequest } from "next/server"
import { handleDirectoryWorkDetailRequest } from "@/features/directory-works/server/directory-works.route-handlers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleDirectoryWorkDetailRequest(id)
}

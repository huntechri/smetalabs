import { NextRequest } from "next/server"
import {
  handleProjectEstimateRecordCreateRequest,
  handleProjectEstimateRecordsListRequest,
} from "@/features/projects/server/project-estimate-records.route-handlers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleProjectEstimateRecordsListRequest(request, id)
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleProjectEstimateRecordCreateRequest(request, id)
}

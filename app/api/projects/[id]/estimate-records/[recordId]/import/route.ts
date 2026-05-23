import { NextRequest, NextResponse } from "next/server"
import { importProjectEstimateContent } from "@/features/projects/server/project-estimate-import.service"
import { handleProjectsRouteError } from "@/features/projects/server/projects.route-handlers"
import {
  parseEstimateContentProjectId,
  parseEstimateContentRecordId,
} from "@/features/projects/server/project-estimate-content.schemas"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string; recordId: string }> }

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id, recordId } = await params
    const projectId = parseEstimateContentProjectId(id)
    const recId = parseEstimateContentRecordId(recordId)

    const body = await request.json()
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Некорректное тело запроса: ожидается массив строк" },
        { status: 400 }
      )
    }

    const result = await importProjectEstimateContent(projectId, recId, body)
    return NextResponse.json(result)
  } catch (err) {
    return handleProjectsRouteError(
      err,
      "[POST /api/projects/[id]/estimate-records/[recordId]/import]"
    )
  }
}

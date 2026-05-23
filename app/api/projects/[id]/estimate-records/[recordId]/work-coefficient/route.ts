import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { supabase } from "@/db"
import { ProjectsApiError } from "@/features/projects/api/projects-errors"
import { handleProjectsRouteError } from "@/features/projects/server/projects.route-handlers"
import {
  requireProjectsReadContext,
  requireProjectsWriteContext,
} from "@/features/projects/server/projects.service"
import { getProjectEstimateContentForWorkspace } from "@/features/projects/server/project-estimate-content.repository"
import {
  parseEstimateContentProjectId,
  parseEstimateContentRecordId,
} from "@/features/projects/server/project-estimate-content.schemas"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string; recordId: string }> }

const bodySchema = z.object({
  coefficientPercent: z.coerce
    .number({ error: "Некорректный коэффициент" })
    .finite("Некорректный коэффициент")
    .min(0, "Коэффициент не может быть меньше 0")
    .max(1000, "Коэффициент слишком большой"),
})

type RecordCoefficientRow = {
  works_coefficient_percent: string | number
}

function toNumber(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

async function readJsonBody(request: NextRequest) {
  try {
    return await request.json()
  } catch {
    throw new ProjectsApiError("BAD_REQUEST", "Некорректное тело запроса", 400)
  }
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id, recordId } = await params
    const projectId = parseEstimateContentProjectId(id)
    const estimateRecordId = parseEstimateContentRecordId(recordId)
    const context = await requireProjectsReadContext()

    const { data, error } = await supabase
      .from("project_estimate_records")
      .select("works_coefficient_percent")
      .eq("workspace_owner_id", context.workspaceOwnerId)
      .eq("project_id", projectId)
      .eq("id", estimateRecordId)
      .is("archived_at", null)
      .is("deleted_at", null)
      .maybeSingle()

    if (error) throw error
    if (!data) throw new ProjectsApiError("NOT_FOUND", "Смета не найдена", 404)

    return NextResponse.json({
      data: {
        coefficientPercent: toNumber(
          (data as RecordCoefficientRow).works_coefficient_percent
        ),
      },
    })
  } catch (err) {
    return handleProjectsRouteError(
      err,
      "[GET /api/projects/[id]/estimate-records/[recordId]/work-coefficient]"
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id, recordId } = await params
    const projectId = parseEstimateContentProjectId(id)
    const estimateRecordId = parseEstimateContentRecordId(recordId)
    const body = bodySchema.parse(await readJsonBody(request))
    const context = await requireProjectsWriteContext()

    const { error } = await supabase.rpc(
      "apply_project_estimate_work_coefficient",
      {
        p_workspace_owner_id: context.workspaceOwnerId,
        p_project_id: projectId,
        p_estimate_record_id: estimateRecordId,
        p_coefficient_percent: body.coefficientPercent,
        p_updated_by: context.userId,
      }
    )

    if (error?.message?.includes("PROJECT_ESTIMATE_RECORD_NOT_FOUND")) {
      throw new ProjectsApiError("NOT_FOUND", "Смета не найдена", 404)
    }

    if (error) throw error

    const response = await getProjectEstimateContentForWorkspace(
      context.workspaceOwnerId,
      projectId,
      estimateRecordId
    )

    return NextResponse.json(response)
  } catch (err) {
    return handleProjectsRouteError(
      err,
      "[POST /api/projects/[id]/estimate-records/[recordId]/work-coefficient]"
    )
  }
}

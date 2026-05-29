import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentWorkspace } from "@/lib/auth/team"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string; recordId: string }> }

function parsePositiveNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseNonNegativeNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: projectId, recordId } = await params

    if (!projectId || !recordId) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "projectId и recordId обязательны",
          },
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: { code: "UNAUTHORIZED", message: "Требуется авторизация" },
        },
        { status: 401 }
      )
    }

    const workspaceOwnerId = await requireCurrentWorkspace(user.id)

    const { data: record, error: recordError } = await supabase
      .from("project_estimate_records")
      .select("id")
      .eq("id", recordId)
      .eq("project_id", projectId)
      .eq("workspace_owner_id", workspaceOwnerId)
      .single()

    if (recordError || !record) {
      return NextResponse.json(
        {
          error: { code: "NOT_FOUND", message: "Смета не найдена" },
        },
        { status: 404 }
      )
    }

    const { data, error } = await supabase.rpc(
      "get_estimate_purchases_with_sources",
      {
        p_estimate_record_id: recordId,
        p_workspace_owner_id: workspaceOwnerId,
      }
    )

    if (error) {
      console.error(
        "[GET /api/projects/[id]/estimate-records/[recordId]/purchases] RPC error:",
        error
      )
      return NextResponse.json(
        { error: { code: "RPC_ERROR", message: error.message } },
        { status: 500 }
      )
    }

    const rows = (data ?? []).map(
      (raw: Record<string, unknown>) => ({
        purchaseId: (raw.purchase_id as string) ?? null,
        materialId: (raw.material_id as string) ?? null,
        title: (raw.title as string) ?? "",
        unit: (raw.unit as string) ?? "",
        planQuantity: Number(raw.plan_quantity ?? 0),
        planPrice: Number(raw.plan_price ?? 0),
        planTotal: Number(raw.plan_total ?? 0),
        factQuantity:
          raw.fact_quantity != null ? Number(raw.fact_quantity) : null,
        factAvgPrice:
          raw.fact_avg_price != null ? Number(raw.fact_avg_price) : null,
        factTotal:
          raw.fact_total != null ? Number(raw.fact_total) : null,
        deviationTotal:
          raw.deviation_total != null ? Number(raw.deviation_total) : null,
        source: (raw.source as "estimate" | "global" | "mixed" | null) ?? null,
        editable: Boolean(raw.editable),
      })
    )

    const searchQuery = request.nextUrl.searchParams.get("q")?.trim() ?? ""
    let filtered = rows
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = rows.filter((row: { title: string }) =>
        row.title.toLowerCase().includes(q)
      )
    }

    return NextResponse.json({ data: filtered })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "WORKSPACE_MEMBER_REQUIRED") {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Нет доступа к workspace" } },
          { status: 403 }
        )
      }
    }

    console.error(
      "[GET /api/projects/[id]/estimate-records/[recordId]/purchases] Unexpected error:",
      err
    )
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Внутренняя ошибка сервера",
        },
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: projectId, recordId } = await params

    if (!projectId || !recordId) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "projectId и recordId обязательны",
          },
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: { code: "UNAUTHORIZED", message: "Требуется авторизация" },
        },
        { status: 401 }
      )
    }

    const workspaceOwnerId = await requireCurrentWorkspace(user.id)

    const { data: record, error: recordError } = await supabase
      .from("project_estimate_records")
      .select("id")
      .eq("id", recordId)
      .eq("project_id", projectId)
      .eq("workspace_owner_id", workspaceOwnerId)
      .single()

    if (recordError || !record) {
      return NextResponse.json(
        {
          error: { code: "NOT_FOUND", message: "Смета не найдена" },
        },
        { status: 404 }
      )
    }

    const body = (await request.json()) as {
      directoryMaterialId?: string
      quantity?: number
      price?: number
    }

    if (!body.directoryMaterialId) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "directoryMaterialId обязателен",
          },
        },
        { status: 400 }
      )
    }

    const quantity = parsePositiveNumber(body.quantity ?? 1)
    const price = parseNonNegativeNumber(body.price ?? 0)

    if (quantity === null || price === null) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Количество должно быть больше 0, цена — не меньше 0",
          },
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc("add_project_estimate_purchase", {
      p_estimate_record_id: recordId,
      p_workspace_owner_id: workspaceOwnerId,
      p_directory_material_id: body.directoryMaterialId,
      p_quantity: quantity,
      p_price: price,
      p_created_by: user.id,
    })

    if (error) {
      console.error(
        "[POST /api/projects/[id]/estimate-records/[recordId]/purchases] RPC error:",
        error
      )
      return NextResponse.json(
        { error: { code: "RPC_ERROR", message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "WORKSPACE_MEMBER_REQUIRED") {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Нет доступа к workspace" } },
          { status: 403 }
        )
      }
    }

    console.error(
      "[POST /api/projects/[id]/estimate-records/[recordId]/purchases] Unexpected error:",
      err
    )
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Внутренняя ошибка сервера",
        },
      },
      { status: 500 }
    )
  }
}

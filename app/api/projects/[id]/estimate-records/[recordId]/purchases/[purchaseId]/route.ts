import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentWorkspace } from "@/lib/auth/team"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string; recordId: string; purchaseId: string }>
}

function parseNonNegativeNumber(value: unknown) {
  if (value === undefined) return undefined

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: projectId, recordId, purchaseId } = await params

    if (!projectId || !recordId || !purchaseId) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "projectId, recordId и purchaseId обязательны",
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

    const { data: purchase, error: purchaseError } = await supabase
      .from("project_estimate_purchases")
      .select("id")
      .eq("id", purchaseId)
      .eq("estimate_record_id", recordId)
      .eq("workspace_owner_id", workspaceOwnerId)
      .is("archived_at", null)
      .is("deleted_at", null)
      .maybeSingle()

    if (purchaseError) {
      console.error(
        "[PATCH /api/projects/[id]/estimate-records/[recordId]/purchases/[purchaseId]] Purchase lookup error:",
        purchaseError
      )
      return NextResponse.json(
        { error: { code: "LOOKUP_ERROR", message: purchaseError.message } },
        { status: 500 }
      )
    }

    if (!purchase) {
      return NextResponse.json(
        {
          error: { code: "NOT_FOUND", message: "Закупка сметы не найдена" },
        },
        { status: 404 }
      )
    }

    const body = (await request.json()) as {
      quantity?: number
      price?: number
    }

    const quantity = parseNonNegativeNumber(body.quantity)
    const price = parseNonNegativeNumber(body.price)

    if (quantity === null || price === null) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Количество и цена должны быть не меньше 0",
          },
        },
        { status: 400 }
      )
    }

    const rpcParams: Record<string, unknown> = {
      p_purchase_id: purchaseId,
      p_workspace_owner_id: workspaceOwnerId,
      p_updated_by: user.id,
    }

    if (quantity !== undefined) rpcParams.p_quantity = quantity
    if (price !== undefined) rpcParams.p_price = price

    const { data, error } = await supabase.rpc(
      "update_project_estimate_purchase",
      rpcParams
    )

    if (error) {
      console.error(
        "[PATCH /api/projects/[id]/estimate-records/[recordId]/purchases/[purchaseId]] RPC error:",
        error
      )
      return NextResponse.json(
        { error: { code: "RPC_ERROR", message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof Error && err.message === "WORKSPACE_MEMBER_REQUIRED") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Нет доступа к workspace" } },
        { status: 403 }
      )
    }

    console.error(
      "[PATCH /api/projects/[id]/estimate-records/[recordId]/purchases/[purchaseId]] Unexpected error:",
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

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id: projectId, recordId, purchaseId } = await params

    if (!projectId || !recordId || !purchaseId) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "projectId, recordId и purchaseId обязательны",
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

    const { data: purchase, error: purchaseError } = await supabase
      .from("project_estimate_purchases")
      .select("id")
      .eq("id", purchaseId)
      .eq("estimate_record_id", recordId)
      .eq("workspace_owner_id", workspaceOwnerId)
      .is("archived_at", null)
      .is("deleted_at", null)
      .maybeSingle()

    if (purchaseError) {
      console.error(
        "[DELETE /api/projects/[id]/estimate-records/[recordId]/purchases/[purchaseId]] Purchase lookup error:",
        purchaseError
      )
      return NextResponse.json(
        { error: { code: "LOOKUP_ERROR", message: purchaseError.message } },
        { status: 500 }
      )
    }

    if (!purchase) {
      return NextResponse.json(
        {
          error: { code: "NOT_FOUND", message: "Закупка сметы не найдена" },
        },
        { status: 404 }
      )
    }

    const { data, error } = await supabase.rpc("archive_project_estimate_purchase", {
      p_purchase_id: purchaseId,
      p_workspace_owner_id: workspaceOwnerId,
      p_updated_by: user.id,
    })

    if (error) {
      console.error(
        "[DELETE /api/projects/[id]/estimate-records/[recordId]/purchases/[purchaseId]] RPC error:",
        error
      )
      return NextResponse.json(
        { error: { code: "RPC_ERROR", message: error.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof Error && err.message === "WORKSPACE_MEMBER_REQUIRED") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Нет доступа к workspace" } },
        { status: 403 }
      )
    }

    console.error(
      "[DELETE /api/projects/[id]/estimate-records/[recordId]/purchases/[purchaseId]] Unexpected error:",
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

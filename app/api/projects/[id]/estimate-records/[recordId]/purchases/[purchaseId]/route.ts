import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentWorkspace } from "@/lib/auth/team"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string; recordId: string; purchaseId: string }>
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

    // Verify the estimate record belongs to the project and workspace
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
      quantity?: number
      price?: number
    }

    const params_: Record<string, unknown> = {
      p_purchase_id: purchaseId,
      p_workspace_owner_id: workspaceOwnerId,
    }

    if (body.quantity !== undefined) {
      params_.p_quantity = Number(body.quantity)
    }
    if (body.price !== undefined) {
      params_.p_price = Number(body.price)
    }

    const { data, error } = await supabase.rpc(
      "update_project_estimate_purchase",
      params_
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
    if (err instanceof Error) {
      if (err.message === "WORKSPACE_MEMBER_REQUIRED") {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Нет доступа к workspace" } },
          { status: 403 }
        )
      }
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

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
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

    // Verify the estimate record belongs to the project and workspace
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
      "archive_project_estimate_purchase",
      {
        p_purchase_id: purchaseId,
        p_workspace_owner_id: workspaceOwnerId,
      }
    )

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
    if (err instanceof Error) {
      if (err.message === "WORKSPACE_MEMBER_REQUIRED") {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Нет доступа к workspace" } },
          { status: 403 }
        )
      }
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

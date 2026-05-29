import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentWorkspace } from "@/lib/auth/team"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ id: string; recordId: string; paymentId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id: projectId, recordId, paymentId } = await params

    if (!projectId || !recordId || !paymentId) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "projectId, recordId и paymentId обязательны",
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
      sectionId?: string | null
      amount?: number
      date?: string
      status?: string
      purpose?: string
    }

    const updates: Record<string, any> = {}
    if (body.sectionId !== undefined) updates.section_id = body.sectionId
    if (body.amount !== undefined) {
      if (Number(body.amount) < 0) {
        return NextResponse.json(
          {
            error: {
              code: "BAD_REQUEST",
              message: "Сумма amount не может быть отрицательной",
            },
          },
          { status: 400 }
        )
      }
      updates.amount = String(body.amount)
    }
    if (body.date !== undefined) updates.date = body.date
    if (body.status !== undefined) updates.status = body.status
    if (body.purpose !== undefined) updates.purpose = body.purpose || ""

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Нет полей для обновления" } },
        { status: 400 }
      )
    }

    updates.updated_by = user.id
    updates.updated_at = new Date().toISOString()

    // Update payment in DB
    const { data: updated, error: updateError } = await supabase
      .from("project_estimate_payments")
      .update(updates)
      .eq("id", paymentId)
      .eq("estimate_record_id", recordId)
      .eq("workspace_owner_id", workspaceOwnerId)
      .select()
      .single()

    if (updateError || !updated) {
      console.error(
        "[PATCH /api/projects/[id]/estimate-records/[recordId]/payments/[paymentId]] DB error:",
        updateError
      )
      return NextResponse.json(
        {
          error: {
            code: "DATABASE_ERROR",
            message: updateError?.message ?? "Не удалось обновить платёж",
          },
        },
        { status: 500 }
      )
    }

    const mapped = {
      paymentId: updated.id,
      sectionId: updated.section_id,
      amount: Number(updated.amount),
      date: updated.date,
      status: updated.status,
      purpose: updated.purpose || "",
    }

    return NextResponse.json({ data: mapped })
  } catch (err) {
    if (err instanceof Error && err.message === "WORKSPACE_MEMBER_REQUIRED") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Нет доступа к workspace" } },
        { status: 403 }
      )
    }

    console.error(
      "[PATCH /api/projects/[id]/estimate-records/[recordId]/payments/[paymentId]] Unexpected error:",
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
    const { id: projectId, recordId, paymentId } = await params

    if (!projectId || !recordId || !paymentId) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "projectId, recordId и paymentId обязательны",
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

    // Delete payment from DB
    const { error: deleteError } = await supabase
      .from("project_estimate_payments")
      .delete()
      .eq("id", paymentId)
      .eq("estimate_record_id", recordId)
      .eq("workspace_owner_id", workspaceOwnerId)

    if (deleteError) {
      console.error(
        "[DELETE /api/projects/[id]/estimate-records/[recordId]/payments/[paymentId]] DB error:",
        deleteError
      )
      return NextResponse.json(
        { error: { code: "DATABASE_ERROR", message: deleteError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === "WORKSPACE_MEMBER_REQUIRED") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Нет доступа к workspace" } },
        { status: 403 }
      )
    }

    console.error(
      "[DELETE /api/projects/[id]/estimate-records/[recordId]/payments/[paymentId]] Unexpected error:",
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

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireCurrentWorkspace } from "@/lib/auth/team"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string; recordId: string }> }

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

    // Query payments from database
    const { data: payments, error: paymentsError } = await supabase
      .from("project_estimate_payments")
      .select("*")
      .eq("estimate_record_id", recordId)
      .eq("workspace_owner_id", workspaceOwnerId)
      .order("date", { ascending: true })

    if (paymentsError) {
      console.error("[GET /api/projects/[id]/estimate-records/[recordId]/payments] DB error:", paymentsError)
      return NextResponse.json(
        { error: { code: "DATABASE_ERROR", message: paymentsError.message } },
        { status: 500 }
      )
    }

    // Map DB columns to client-side types
    const mapped = (payments ?? []).map((p: any) => ({
      paymentId: p.id,
      sectionId: p.section_id,
      amount: Number(p.amount),
      date: p.date,
      status: p.status,
      purpose: p.purpose || "",
    }))

    return NextResponse.json({ data: mapped })
  } catch (err) {
    if (err instanceof Error && err.message === "WORKSPACE_MEMBER_REQUIRED") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Нет доступа к workspace" } },
        { status: 403 }
      )
    }

    console.error("[GET /api/projects/[id]/estimate-records/[recordId]/payments] Unexpected error:", err)
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
      amount: number
      date: string
      status: string
      purpose?: string
    }

    if (body.amount === undefined || !body.date || !body.status) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Поля amount, date, status обязательны",
          },
        },
        { status: 400 }
      )
    }

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

    // Insert payment
    const { data: inserted, error: insertError } = await supabase
      .from("project_estimate_payments")
      .insert({
        workspace_owner_id: workspaceOwnerId,
        estimate_record_id: recordId,
        section_id: body.sectionId || null,
        amount: String(body.amount), // numeric represented as string in insert
        date: body.date,
        status: body.status,
        purpose: body.purpose || "",
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError || !inserted) {
      console.error("[POST /api/projects/[id]/estimate-records/[recordId]/payments] DB error:", insertError)
      return NextResponse.json(
        { error: { code: "DATABASE_ERROR", message: insertError?.message ?? "Не удалось создать платёж" } },
        { status: 500 }
      )
    }

    const mapped = {
      paymentId: inserted.id,
      sectionId: inserted.section_id,
      amount: Number(inserted.amount),
      date: inserted.date,
      status: inserted.status,
      purpose: inserted.purpose || "",
    }

    return NextResponse.json({ data: mapped }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === "WORKSPACE_MEMBER_REQUIRED") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Нет доступа к workspace" } },
        { status: 403 }
      )
    }

    console.error("[POST /api/projects/[id]/estimate-records/[recordId]/payments] Unexpected error:", err)
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

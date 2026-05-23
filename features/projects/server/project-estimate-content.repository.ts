import { supabase } from "@/db"
import { ProjectsApiError } from "../api/projects-errors"
import type {
  ProjectEstimateContentMaterial,
  ProjectEstimateContentResponse,
  ProjectEstimateContentSection,
  ProjectEstimateContentWork,
} from "@/types/project-estimate-content"
import type { EstimateContentChangeInput } from "./project-estimate-content.schemas"

type RecordRow = {
  id: string
  project_id: string
  name: string
  type: string
  status: "new" | "in_progress" | "completed"
  amount: string | number
}

type SectionRow = {
  id: string
  title: string
  number: string
  sort_order: number
  works_amount: string | number
  materials_amount: string | number
  total_amount: string | number
}

type WorkRow = {
  id: string
  section_id: string
  number: string
  code: string | null
  title: string
  unit_code: string
  unit_label: string
  quantity: string | number
  price: string | number
  total_amount: string | number
  category: string | null
  notes: string | null
  sort_order: number
}

type MaterialRow = {
  id: string
  work_id: string
  section_id: string
  number: string
  code: string | null
  title: string
  unit_code: string
  unit_label: string
  quantity: string | number
  consumption: string | number | null
  price: string | number
  total_amount: string | number
  supplier_name: string | null
  notes: string | null
  sort_order: number
  directory_materials?: any
}

type WorkIdentityRow = {
  id: string
  section_id: string
  quantity: string | number
}

type MaterialIdentityRow = {
  id: string
  work_id: string
  section_id: string
  quantity: string | number
  consumption: string | number | null
  price: string | number
}

const RECORD_SELECT = "id,project_id,name,type,status,amount"
const SECTION_SELECT =
  "id,title,number,sort_order,works_amount,materials_amount,total_amount"
const WORK_SELECT =
  "id,section_id,number,code,title,unit_code,unit_label,quantity,price,total_amount,category,notes,sort_order"
const MATERIAL_SELECT =
  "id,work_id,section_id,number,code,title,unit_code,unit_label,quantity,consumption,price,total_amount,supplier_name,notes,sort_order,directory_material_id,directory_materials(image_url)"

function toNumber(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function roundQuantity(value: number) {
  return Math.ceil(value)
}

function roundConsumption(value: number) {
  return Math.round(value * 1000000) / 1000000
}

function mapRecord(row: RecordRow) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    type: row.type,
    status: row.status,
    amount: toNumber(row.amount),
  }
}

function mapMaterial(row: MaterialRow): ProjectEstimateContentMaterial {
  let imageUrl: string | null = null
  if (row.directory_materials) {
    if (Array.isArray(row.directory_materials)) {
      imageUrl = row.directory_materials[0]?.image_url ?? null
    } else {
      imageUrl = row.directory_materials.image_url ?? null
    }
  }

  return {
    id: row.id,
    workId: row.work_id,
    sectionId: row.section_id,
    number: row.number,
    code: row.code,
    title: row.title,
    unitCode: row.unit_code,
    unitLabel: row.unit_label,
    quantity: toNumber(row.quantity),
    consumption: row.consumption === null ? null : toNumber(row.consumption),
    price: toNumber(row.price),
    totalAmount: toNumber(row.total_amount),
    supplierName: row.supplier_name,
    notes: row.notes,
    imageUrl,
    sortOrder: row.sort_order,
  }
}

function mapWork(
  row: WorkRow,
  materials: ProjectEstimateContentMaterial[]
): ProjectEstimateContentWork {
  const materialsAmount = roundMoney(
    materials.reduce((sum, material) => sum + material.totalAmount, 0)
  )
  const totalAmount = toNumber(row.total_amount)

  return {
    id: row.id,
    sectionId: row.section_id,
    number: row.number,
    code: row.code,
    title: row.title,
    unitCode: row.unit_code,
    unitLabel: row.unit_label,
    quantity: toNumber(row.quantity),
    price: toNumber(row.price),
    totalAmount,
    category: row.category,
    notes: row.notes,
    sortOrder: row.sort_order,
    materialsAmount,
    totalWithMaterialsAmount: roundMoney(totalAmount + materialsAmount),
    materials,
  }
}

function mapSection(
  row: SectionRow,
  works: ProjectEstimateContentWork[]
): ProjectEstimateContentSection {
  return {
    id: row.id,
    title: row.title,
    number: row.number,
    sortOrder: row.sort_order,
    worksAmount: toNumber(row.works_amount),
    materialsAmount: toNumber(row.materials_amount),
    totalAmount: toNumber(row.total_amount),
    works,
  }
}

async function assertRecord(
  workspaceOwnerId: string,
  projectId: string,
  recordId: string
) {
  const { data, error } = await supabase
    .from("project_estimate_records")
    .select(RECORD_SELECT)
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("project_id", projectId)
    .eq("id", recordId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ProjectsApiError("NOT_FOUND", "Смета не найдена", 404)
  return data as RecordRow
}

async function getSection(
  workspaceOwnerId: string,
  projectId: string,
  recordId: string,
  sectionId: string
) {
  const { data, error } = await supabase
    .from("project_estimate_sections")
    .select("id")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("project_id", projectId)
    .eq("estimate_record_id", recordId)
    .eq("id", sectionId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ProjectsApiError("NOT_FOUND", "Раздел не найден", 404)
  return data as { id: string }
}

async function getWork(
  workspaceOwnerId: string,
  projectId: string,
  recordId: string,
  workId: string
) {
  const { data, error } = await supabase
    .from("project_estimate_works")
    .select("id,section_id,quantity")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("project_id", projectId)
    .eq("estimate_record_id", recordId)
    .eq("id", workId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ProjectsApiError("NOT_FOUND", "Работа не найдена", 404)
  return data as WorkIdentityRow
}

async function getMaterial(
  workspaceOwnerId: string,
  projectId: string,
  recordId: string,
  materialId: string
) {
  const { data, error } = await supabase
    .from("project_estimate_materials")
    .select("id,work_id,section_id,quantity,consumption,price")
    .eq("workspace_owner_id", workspaceOwnerId)
    .eq("project_id", projectId)
    .eq("estimate_record_id", recordId)
    .eq("id", materialId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new ProjectsApiError("NOT_FOUND", "Материал не найден", 404)
  return data as MaterialIdentityRow
}

async function getNextNumber(table: string, filters: Record<string, string>) {
  let query = supabase.from(table).select("id", { count: "exact", head: true })
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value)
  })
  query = query.is("archived_at", null).is("deleted_at", null)

  const { count, error } = await query
  if (error) throw error
  return String((count ?? 0) + 1)
}

async function getNextSortOrder(
  table: string,
  filters: Record<string, string>
) {
  let query = supabase
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value)
  })
  query = query.is("archived_at", null).is("deleted_at", null)

  const { data, error } = await query
  if (error) throw error
  const max = toNumber(
    (data?.[0] as { sort_order?: number } | undefined)?.sort_order
  )
  return max + 1000
}

function resolveMaterialQuantity(params: {
  workQuantity: number
  currentQuantity?: number
  currentConsumption?: number | null
  quantity?: number
  consumption?: number | null
  changedField?: "quantity" | "consumption" | "price" | "workQuantity"
}) {
  const changedField = params.changedField ?? "quantity"
  const nextConsumption =
    params.consumption !== undefined
      ? params.consumption
      : (params.currentConsumption ?? null)
  const inputQuantity =
    params.quantity !== undefined
      ? params.quantity
      : (params.currentQuantity ?? 0)

  if (
    (changedField === "consumption" || changedField === "workQuantity") &&
    nextConsumption !== null
  ) {
    return {
      quantity: roundQuantity(params.workQuantity * nextConsumption),
      consumption: nextConsumption,
    }
  }

  if (changedField === "quantity") {
    const resolvedQty = roundQuantity(inputQuantity)
    return {
      quantity: resolvedQty,
      consumption:
        params.workQuantity > 0
          ? roundConsumption(resolvedQty / params.workQuantity)
          : null,
    }
  }

  return {
    quantity: roundQuantity(inputQuantity),
    consumption: nextConsumption,
  }
}

async function recalculateMaterialsByWorkQuantity(
  workspaceOwnerId: string,
  projectId: string,
  recordId: string,
  workId: string,
  workQuantity: number,
  userId: string
) {
  const { error } = await supabase.rpc(
    "recalculate_materials_by_work_quantity",
    {
      p_workspace_owner_id: workspaceOwnerId,
      p_project_id: projectId,
      p_estimate_record_id: recordId,
      p_work_id: workId,
      p_work_quantity: workQuantity,
      p_updated_by: userId,
    }
  )

  if (error) throw error
}

export async function getProjectEstimateContentForWorkspace(
  workspaceOwnerId: string,
  projectId: string,
  recordId: string
): Promise<ProjectEstimateContentResponse> {
  const record = await assertRecord(workspaceOwnerId, projectId, recordId)

  const [
    { data: sectionRows, error: sectionError },
    { data: workRows, error: workError },
    { data: materialRows, error: materialError },
  ] = await Promise.all([
    supabase
      .from("project_estimate_sections")
      .select(SECTION_SELECT)
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("project_id", projectId)
      .eq("estimate_record_id", recordId)
      .is("archived_at", null)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("project_estimate_works")
      .select(WORK_SELECT)
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("project_id", projectId)
      .eq("estimate_record_id", recordId)
      .is("archived_at", null)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("project_estimate_materials")
      .select(MATERIAL_SELECT)
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("project_id", projectId)
      .eq("estimate_record_id", recordId)
      .is("archived_at", null)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
  ])

  if (sectionError) throw sectionError
  if (workError) throw workError
  if (materialError) throw materialError

  const materialsByWork = new Map<string, ProjectEstimateContentMaterial[]>()
  ;((materialRows ?? []) as MaterialRow[]).forEach((row) => {
    const items = materialsByWork.get(row.work_id) ?? []
    items.push(mapMaterial(row))
    materialsByWork.set(row.work_id, items)
  })

  const worksBySection = new Map<string, ProjectEstimateContentWork[]>()
  ;((workRows ?? []) as WorkRow[]).forEach((row) => {
    const items = worksBySection.get(row.section_id) ?? []
    items.push(mapWork(row, materialsByWork.get(row.id) ?? []))
    worksBySection.set(row.section_id, items)
  })

  const sections = ((sectionRows ?? []) as SectionRow[]).map((row) =>
    mapSection(row, worksBySection.get(row.id) ?? [])
  )

  const summary = sections.reduce(
    (acc, section) => ({
      worksAmount: roundMoney(acc.worksAmount + section.worksAmount),
      materialsAmount: roundMoney(
        acc.materialsAmount + section.materialsAmount
      ),
      totalAmount: roundMoney(acc.totalAmount + section.totalAmount),
    }),
    { worksAmount: 0, materialsAmount: 0, totalAmount: 0 }
  )

  return { data: { record: mapRecord(record), sections, summary } }
}

/**
 * Maps RPC jsonb response into ProjectEstimateContentData.
 * Used to eliminate read-after-write for insert/delete RPC operations.
 */
type RpcRowValue =
  | string
  | number
  | boolean
  | null
  | RpcRowValue[]
  | { [key: string]: RpcRowValue }
type RpcRow = Record<string, RpcRowValue>

function mapRpcSectionResponse(
  json: RpcRow
): ProjectEstimateContentResponse["data"] {
  const sectionRaw = json.section as RpcRow | undefined
  const worksRaw = (json.works ?? []) as RpcRow[]
  const materialsRaw = (json.materials ?? []) as RpcRow[]
  const recordRaw = json.record as RpcRow | undefined

  const narrow = (
    v: RpcRowValue | undefined
  ): string | number | null | undefined =>
    v === null ||
    v === undefined ||
    typeof v === "string" ||
    typeof v === "number"
      ? (v as string | number | null | undefined)
      : undefined

  const materialsByWork = new Map<string, ProjectEstimateContentMaterial[]>()
  materialsRaw.forEach((row) => {
    const workId = String(row.workId ?? "")
    const items = materialsByWork.get(workId) ?? []
    items.push({
      id: String(row.id ?? ""),
      workId,
      sectionId: String(row.sectionId ?? ""),
      number: String(row.number ?? ""),
      code: (row.code as string | null) ?? null,
      title: String(row.title ?? ""),
      unitCode: String(row.unitCode ?? ""),
      unitLabel: String(row.unitLabel ?? ""),
      quantity: toNumber(narrow(row.quantity)),
      consumption:
        row.consumption === null ? null : toNumber(narrow(row.consumption)),
      price: toNumber(narrow(row.price)),
      totalAmount: toNumber(narrow(row.totalAmount)),
      supplierName: (row.supplierName as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      imageUrl: (row.imageUrl as string | null) ?? null,
      sortOrder: toNumber(narrow(row.sortOrder)),
    })
    materialsByWork.set(workId, items)
  })

  const works: ProjectEstimateContentWork[] = worksRaw.map((row) => {
    const rowId = String(row.id ?? "")
    const ms = materialsByWork.get(rowId) ?? []
    const materialsAmount = roundMoney(
      ms.reduce((sum, m) => sum + m.totalAmount, 0)
    )
    const totalAmount = toNumber(narrow(row.totalAmount))
    return {
      id: rowId,
      sectionId: String(row.sectionId ?? ""),
      number: String(row.number ?? ""),
      code: (row.code as string | null) ?? null,
      title: String(row.title ?? ""),
      unitCode: String(row.unitCode ?? ""),
      unitLabel: String(row.unitLabel ?? ""),
      quantity: toNumber(narrow(row.quantity)),
      price: toNumber(narrow(row.price)),
      totalAmount,
      category: (row.category as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      sortOrder: toNumber(narrow(row.sortOrder)),
      materialsAmount,
      totalWithMaterialsAmount: roundMoney(totalAmount + materialsAmount),
      materials: ms,
    }
  })

  const section: ProjectEstimateContentSection = {
    id: String(sectionRaw?.id ?? ""),
    title: String(sectionRaw?.title ?? ""),
    number: String(sectionRaw?.number ?? ""),
    sortOrder: toNumber(narrow(sectionRaw?.sortOrder)),
    worksAmount: toNumber(narrow(sectionRaw?.worksAmount)),
    materialsAmount: toNumber(narrow(sectionRaw?.materialsAmount)),
    totalAmount: toNumber(narrow(sectionRaw?.totalAmount)),
    works,
  }

  return {
    record: {
      id: String(recordRaw?.id ?? ""),
      projectId: String(recordRaw?.projectId ?? ""),
      name: String(recordRaw?.name ?? ""),
      type: String(recordRaw?.type ?? ""),
      status:
        (recordRaw?.status as "new" | "in_progress" | "completed") ?? "new",
      amount: toNumber(narrow(recordRaw?.amount)),
    },
    sections: [section],
    summary: {
      worksAmount: section.worksAmount,
      materialsAmount: section.materialsAmount,
      totalAmount: section.totalAmount,
    },
  }
}

/**
 * Reads a single section with all its works and materials.
 * Used for targeted re-read after update_material/update_work.
 */
async function getProjectEstimateContentSectionForWorkspace(
  workspaceOwnerId: string,
  projectId: string,
  recordId: string,
  sectionId: string
): Promise<ProjectEstimateContentSection> {
  const [
    { data: sectionRows, error: sectionError },
    { data: workRows, error: workError },
    { data: materialRows, error: materialError },
  ] = await Promise.all([
    supabase
      .from("project_estimate_sections")
      .select(SECTION_SELECT)
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("project_id", projectId)
      .eq("estimate_record_id", recordId)
      .eq("id", sectionId)
      .is("archived_at", null)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("project_estimate_works")
      .select(WORK_SELECT)
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("project_id", projectId)
      .eq("estimate_record_id", recordId)
      .eq("section_id", sectionId)
      .is("archived_at", null)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("project_estimate_materials")
      .select(MATERIAL_SELECT)
      .eq("workspace_owner_id", workspaceOwnerId)
      .eq("project_id", projectId)
      .eq("estimate_record_id", recordId)
      .eq("section_id", sectionId)
      .is("archived_at", null)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
  ])

  if (sectionError) throw sectionError
  if (workError) throw workError
  if (materialError) throw materialError
  if (!sectionRows)
    throw new ProjectsApiError("NOT_FOUND", "Раздел не найден", 404)

  const materialsByWork = new Map<string, ProjectEstimateContentMaterial[]>()
  ;((materialRows ?? []) as MaterialRow[]).forEach((row) => {
    const items = materialsByWork.get(row.work_id) ?? []
    items.push(mapMaterial(row))
    materialsByWork.set(row.work_id, items)
  })

  const works = ((workRows ?? []) as WorkRow[]).map((row) =>
    mapWork(row, materialsByWork.get(row.id) ?? [])
  )

  return mapSection(sectionRows as SectionRow, works)
}

export async function applyProjectEstimateContentChangeForWorkspace(
  workspaceOwnerId: string,
  userId: string,
  projectId: string,
  recordId: string,
  input: EstimateContentChangeInput
): Promise<ProjectEstimateContentResponse> {
  await assertRecord(workspaceOwnerId, projectId, recordId)

  switch (input.action) {
    case "create_section": {
      const { data: sectionData, error } = await supabase.rpc(
        "create_estimate_section",
        {
          p_workspace_owner_id: workspaceOwnerId,
          p_project_id: projectId,
          p_estimate_record_id: recordId,
          p_title: input.payload.title,
          p_created_by: userId,
        }
      )
      if (error) throw error
      return {
        data: mapRpcSectionResponse(sectionData),
        _partial: true,
      } as ProjectEstimateContentResponse & { _partial?: boolean }
    }
    case "update_section": {
      await getSection(
        workspaceOwnerId,
        projectId,
        recordId,
        input.payload.sectionId
      )
      const patch: Record<string, unknown> = { updated_by: userId }
      if (input.payload.title !== undefined) patch.title = input.payload.title
      if (input.payload.sortOrder !== undefined)
        patch.sort_order = input.payload.sortOrder
      const { error } = await supabase
        .from("project_estimate_sections")
        .update(patch)
        .eq("workspace_owner_id", workspaceOwnerId)
        .eq("project_id", projectId)
        .eq("estimate_record_id", recordId)
        .eq("id", input.payload.sectionId)
      if (error) throw error
      break
    }
    case "archive_section": {
      const { error } = await supabase.rpc("archive_estimate_section", {
        p_workspace_owner_id: workspaceOwnerId,
        p_project_id: projectId,
        p_estimate_record_id: recordId,
        p_section_id: input.payload.sectionId,
        p_updated_by: userId,
      })
      if (error) throw error
      // Section deleted — full re-read needed (structure changed)
      break
    }
    case "reorder_sections": {
      const { error } = await supabase.rpc("reorder_estimate_sections", {
        p_workspace_owner_id: workspaceOwnerId,
        p_project_id: projectId,
        p_estimate_record_id: recordId,
        p_items: input.payload.items,
        p_updated_by: userId,
      })
      if (error) throw error
      break
    }
    case "add_work_from_directory": {
      const { data: sectionData, error } = await supabase.rpc(
        "add_work_from_directory_to_estimate",
        {
          p_workspace_owner_id: workspaceOwnerId,
          p_project_id: projectId,
          p_estimate_record_id: recordId,
          p_section_id: input.payload.sectionId,
          p_directory_work_id: input.payload.directoryWorkId,
          p_quantity: input.payload.quantity,
          p_price: input.payload.price ?? null,
          p_created_by: userId,
        }
      )
      if (error) throw error
      if (!sectionData) return { data: null as never, _duplicate: true }
      return {
        data: mapRpcSectionResponse(sectionData),
        _partial: true,
      } as ProjectEstimateContentResponse & { _partial?: boolean }
    }
    case "add_manual_work": {
      await getSection(
        workspaceOwnerId,
        projectId,
        recordId,
        input.payload.sectionId
      )
      const number = await getNextNumber("project_estimate_works", {
        workspace_owner_id: workspaceOwnerId,
        project_id: projectId,
        estimate_record_id: recordId,
        section_id: input.payload.sectionId,
      })
      const sortOrder =
        input.payload.sortOrder ??
        (await getNextSortOrder("project_estimate_works", {
          workspace_owner_id: workspaceOwnerId,
          project_id: projectId,
          estimate_record_id: recordId,
          section_id: input.payload.sectionId,
        }))
      const { error } = await supabase
        .from("project_estimate_works")
        .insert({
          workspace_owner_id: workspaceOwnerId,
          project_id: projectId,
          estimate_record_id: recordId,
          section_id: input.payload.sectionId,
          number,
          title: input.payload.title,
          unit_code: input.payload.unitCode,
          unit_label: input.payload.unitLabel,
          quantity: input.payload.quantity,
          price: input.payload.price,
          category: input.payload.category ?? null,
          notes: input.payload.notes,
          sort_order: sortOrder,
          created_by: userId,
          updated_by: userId,
        })
      if (error) throw error
      {
        const record = await assertRecord(workspaceOwnerId, projectId, recordId)
        const section = await getProjectEstimateContentSectionForWorkspace(
          workspaceOwnerId,
          projectId,
          recordId,
          input.payload.sectionId
        )
        return {
          data: {
            record: mapRecord(record),
            sections: [section],
            summary: {
              worksAmount: section.worksAmount,
              materialsAmount: section.materialsAmount,
              totalAmount: section.totalAmount,
            },
          },
          _partial: true,
        } as ProjectEstimateContentResponse & { _partial?: boolean }
      }
    }
    case "update_work": {
      const work = await getWork(
        workspaceOwnerId,
        projectId,
        recordId,
        input.payload.workId
      )
      const nextSectionId = input.payload.sectionId ?? work.section_id
      if (input.payload.sectionId)
        await getSection(
          workspaceOwnerId,
          projectId,
          recordId,
          input.payload.sectionId
        )
      const patch: Record<string, unknown> = { updated_by: userId }
      if (input.payload.title !== undefined) patch.title = input.payload.title
      if (input.payload.quantity !== undefined)
        patch.quantity = input.payload.quantity
      if (input.payload.price !== undefined) patch.price = input.payload.price
      if (input.payload.notes !== undefined) patch.notes = input.payload.notes
      if (input.payload.sortOrder !== undefined)
        patch.sort_order = input.payload.sortOrder
      if (input.payload.sectionId !== undefined)
        patch.section_id = input.payload.sectionId
      const { error } = await supabase
        .from("project_estimate_works")
        .update(patch)
        .eq("workspace_owner_id", workspaceOwnerId)
        .eq("project_id", projectId)
        .eq("estimate_record_id", recordId)
        .eq("id", input.payload.workId)
      if (error) throw error
      if (input.payload.sectionId !== undefined) {
        const { error: materialMoveError } = await supabase
          .from("project_estimate_materials")
          .update({ section_id: nextSectionId, updated_by: userId })
          .eq("workspace_owner_id", workspaceOwnerId)
          .eq("project_id", projectId)
          .eq("estimate_record_id", recordId)
          .eq("work_id", input.payload.workId)
        if (materialMoveError) throw materialMoveError
      }
      if (input.payload.quantity !== undefined)
        await recalculateMaterialsByWorkQuantity(
          workspaceOwnerId,
          projectId,
          recordId,
          input.payload.workId,
          input.payload.quantity,
          userId
        )
      {
        // Targeted re-read for update_work (non-RPC mutation)
        const record = await assertRecord(workspaceOwnerId, projectId, recordId)
        const section = await getProjectEstimateContentSectionForWorkspace(
          workspaceOwnerId,
          projectId,
          recordId,
          nextSectionId
        )
        return {
          data: {
            record: mapRecord(record),
            sections: [section],
            summary: {
              worksAmount: section.worksAmount,
              materialsAmount: section.materialsAmount,
              totalAmount: section.totalAmount,
            },
          },
          _partial: true,
        } as ProjectEstimateContentResponse & { _partial?: boolean }
      }
    }
    case "archive_work": {
      const { data: sectionData, error } = await supabase.rpc(
        "archive_estimate_work",
        {
          p_workspace_owner_id: workspaceOwnerId,
          p_project_id: projectId,
          p_estimate_record_id: recordId,
          p_work_id: input.payload.workId,
          p_updated_by: userId,
        }
      )
      if (error) throw error
      return {
        data: mapRpcSectionResponse(sectionData),
        _partial: true,
      } as ProjectEstimateContentResponse & { _partial?: boolean }
    }
    case "reorder_works": {
      await getSection(
        workspaceOwnerId,
        projectId,
        recordId,
        input.payload.sectionId
      )
      const { error } = await supabase.rpc("reorder_estimate_works", {
        p_workspace_owner_id: workspaceOwnerId,
        p_project_id: projectId,
        p_estimate_record_id: recordId,
        p_section_id: input.payload.sectionId,
        p_items: input.payload.items,
        p_updated_by: userId,
      })
      if (error) throw error
      break
    }
    case "move_work_to_section": {
      await getWork(workspaceOwnerId, projectId, recordId, input.payload.workId)
      await getSection(
        workspaceOwnerId,
        projectId,
        recordId,
        input.payload.sectionId
      )
      const patch: Record<string, unknown> = {
        section_id: input.payload.sectionId,
        updated_by: userId,
      }
      if (input.payload.sortOrder !== undefined)
        patch.sort_order = input.payload.sortOrder
      const { error } = await supabase
        .from("project_estimate_works")
        .update(patch)
        .eq("workspace_owner_id", workspaceOwnerId)
        .eq("project_id", projectId)
        .eq("estimate_record_id", recordId)
        .eq("id", input.payload.workId)
      if (error) throw error
      const { error: materialError } = await supabase
        .from("project_estimate_materials")
        .update({ section_id: input.payload.sectionId, updated_by: userId })
        .eq("workspace_owner_id", workspaceOwnerId)
        .eq("project_id", projectId)
        .eq("estimate_record_id", recordId)
        .eq("work_id", input.payload.workId)
      if (materialError) throw materialError
      break
    }
    case "add_material_from_directory": {
      const { data: sectionData, error } = await supabase.rpc(
        "add_material_from_directory_to_estimate",
        {
          p_workspace_owner_id: workspaceOwnerId,
          p_project_id: projectId,
          p_estimate_record_id: recordId,
          p_work_id: input.payload.workId,
          p_directory_material_id: input.payload.directoryMaterialId,
          p_quantity: input.payload.quantity ?? 0,
          p_consumption: input.payload.consumption ?? null,
          p_price: input.payload.price ?? null,
          p_created_by: userId,
          p_changed_field: input.payload.changedField ?? "quantity",
        }
      )
      if (error) throw error
      if (!sectionData) return { data: null as never, _duplicate: true }
      return {
        data: mapRpcSectionResponse(sectionData),
        _partial: true,
      } as ProjectEstimateContentResponse & { _partial?: boolean }
    }
    case "add_manual_material": {
      const work = await getWork(
        workspaceOwnerId,
        projectId,
        recordId,
        input.payload.workId
      )
      const resolved = resolveMaterialQuantity({
        workQuantity: toNumber(work.quantity),
        quantity: input.payload.quantity,
        consumption: input.payload.consumption,
        changedField: input.payload.changedField,
      })
      const number = await getNextNumber("project_estimate_materials", {
        workspace_owner_id: workspaceOwnerId,
        project_id: projectId,
        estimate_record_id: recordId,
        work_id: input.payload.workId,
      })
      const sortOrder =
        input.payload.sortOrder ??
        (await getNextSortOrder("project_estimate_materials", {
          workspace_owner_id: workspaceOwnerId,
          project_id: projectId,
          estimate_record_id: recordId,
          work_id: input.payload.workId,
        }))
      const { error } = await supabase
        .from("project_estimate_materials")
        .insert({
          workspace_owner_id: workspaceOwnerId,
          project_id: projectId,
          estimate_record_id: recordId,
          section_id: work.section_id,
          work_id: work.id,
          number,
          title: input.payload.title,
          unit_code: input.payload.unitCode,
          unit_label: input.payload.unitLabel,
          quantity: resolved.quantity,
          consumption: resolved.consumption,
          price: input.payload.price,
          supplier_name: input.payload.supplierName,
          notes: input.payload.notes,
          sort_order: sortOrder,
          created_by: userId,
          updated_by: userId,
        })
      if (error) throw error
      {
        const record = await assertRecord(workspaceOwnerId, projectId, recordId)
        const section = await getProjectEstimateContentSectionForWorkspace(
          workspaceOwnerId,
          projectId,
          recordId,
          work.section_id
        )
        return {
          data: {
            record: mapRecord(record),
            sections: [section],
            summary: {
              worksAmount: section.worksAmount,
              materialsAmount: section.materialsAmount,
              totalAmount: section.totalAmount,
            },
          },
          _partial: true,
        } as ProjectEstimateContentResponse & { _partial?: boolean }
      }
    }
    case "update_material": {
      const material = await getMaterial(
        workspaceOwnerId,
        projectId,
        recordId,
        input.payload.materialId
      )
      const targetWork = input.payload.workId
        ? await getWork(
            workspaceOwnerId,
            projectId,
            recordId,
            input.payload.workId
          )
        : await getWork(workspaceOwnerId, projectId, recordId, material.work_id)
      const resolved = resolveMaterialQuantity({
        workQuantity: toNumber(targetWork.quantity),
        currentQuantity: toNumber(material.quantity),
        currentConsumption:
          material.consumption === null ? null : toNumber(material.consumption),
        quantity: input.payload.quantity,
        consumption: input.payload.consumption,
        changedField: input.payload.changedField,
      })
      const patch: Record<string, unknown> = { updated_by: userId }
      if (input.payload.workId !== undefined) {
        patch.work_id = targetWork.id
        patch.section_id = targetWork.section_id
      }
      if (input.payload.title !== undefined) patch.title = input.payload.title
      if (
        input.payload.quantity !== undefined ||
        input.payload.consumption !== undefined ||
        input.payload.changedField === "workQuantity"
      ) {
        patch.quantity = resolved.quantity
        patch.consumption = resolved.consumption
      }
      if (input.payload.price !== undefined) patch.price = input.payload.price
      if (input.payload.notes !== undefined) patch.notes = input.payload.notes
      if (input.payload.sortOrder !== undefined)
        patch.sort_order = input.payload.sortOrder
      const { error } = await supabase
        .from("project_estimate_materials")
        .update(patch)
        .eq("workspace_owner_id", workspaceOwnerId)
        .eq("project_id", projectId)
        .eq("estimate_record_id", recordId)
        .eq("id", input.payload.materialId)
      if (error) throw error
      {
        // Targeted re-read for update_material (non-RPC mutation)
        const record = await assertRecord(workspaceOwnerId, projectId, recordId)
        const section = await getProjectEstimateContentSectionForWorkspace(
          workspaceOwnerId,
          projectId,
          recordId,
          targetWork.section_id
        )
        return {
          data: {
            record: mapRecord(record),
            sections: [section],
            summary: {
              worksAmount: section.worksAmount,
              materialsAmount: section.materialsAmount,
              totalAmount: section.totalAmount,
            },
          },
          _partial: true,
        } as ProjectEstimateContentResponse & { _partial?: boolean }
      }
    }
    case "archive_material": {
      const { data: sectionData, error } = await supabase.rpc(
        "archive_estimate_material",
        {
          p_workspace_owner_id: workspaceOwnerId,
          p_project_id: projectId,
          p_estimate_record_id: recordId,
          p_material_id: input.payload.materialId,
          p_updated_by: userId,
        }
      )
      if (error) throw error
      return {
        data: mapRpcSectionResponse(sectionData),
        _partial: true,
      } as ProjectEstimateContentResponse & { _partial?: boolean }
    }
    case "move_material_to_work": {
      await getMaterial(
        workspaceOwnerId,
        projectId,
        recordId,
        input.payload.materialId
      )
      const work = await getWork(
        workspaceOwnerId,
        projectId,
        recordId,
        input.payload.workId
      )
      const patch: Record<string, unknown> = {
        work_id: work.id,
        section_id: work.section_id,
        updated_by: userId,
      }
      if (input.payload.sortOrder !== undefined)
        patch.sort_order = input.payload.sortOrder
      const { error } = await supabase
        .from("project_estimate_materials")
        .update(patch)
        .eq("workspace_owner_id", workspaceOwnerId)
        .eq("project_id", projectId)
        .eq("estimate_record_id", recordId)
        .eq("id", input.payload.materialId)
      if (error) throw error
      break
    }
    default:
      throw new ProjectsApiError("BAD_REQUEST", "Некорректное действие", 400)
  }

  // Full re-read for non-RPC mutations (manual inserts, reorders, move, archive_section)
  return getProjectEstimateContentForWorkspace(
    workspaceOwnerId,
    projectId,
    recordId
  )
}

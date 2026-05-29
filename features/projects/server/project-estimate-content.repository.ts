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
  fact_quantity: string | number
  fact_price: string | number
  total_amount: string | number
  category: string | null
  notes: string | null
  sort_order: number
}

type MaterialRow = {
  id: string
  work_id: string
  section_id: string
  directory_material_id: string | null
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
  "id,section_id,number,code,title,unit_code,unit_label,quantity,price,total_amount,category,notes,sort_order,fact_quantity,fact_price"
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

function mapRecord(
  row: RecordRow,
  projectDetails?: { title: string; customer_name: string | null; address: string | null } | null,
  profileDetails?: { workspace_name: string | null; workspace_logo: string | null } | null
) {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    type: row.type,
    status: row.status,
    amount: toNumber(row.amount),
    projectName: projectDetails?.title ?? null,
    customerName: projectDetails?.customer_name ?? null,
    projectAddress: projectDetails?.address ?? null,
    workspaceName: profileDetails?.workspace_name ?? null,
    workspaceLogo: profileDetails?.workspace_logo ?? null,
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
    directoryMaterialId: row.directory_material_id,
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
  const factQuantity = toNumber(row.fact_quantity)
  const factPrice = toNumber(row.fact_price)
  const factTotalAmount = roundMoney(factQuantity * factPrice)

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
    factQuantity,
    factPrice,
    factTotalAmount,
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
          : nextConsumption,
    }
  }

  return {
    quantity: roundQuantity(inputQuantity),
    consumption: nextConsumption,
  }
}

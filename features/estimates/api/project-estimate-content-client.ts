import type {
  ProjectEstimateContentResponse,
  ProjectEstimateMaterialOptionRow,
  ProjectEstimateOptionRow,
  ProjectEstimateOptionsResponse,
} from "@/types/project-estimate-content"
import { throwProjectsApiError } from "@/features/projects/api/projects-errors"

export type EstimateContentOptionsParams = {
  q?: string
  limit?: number
  cursor?: number
}

export type EstimateWorkCoefficientResponse = {
  data: {
    coefficientPercent: number
  }
}

type SortItem = {
  id: string
  sortOrder: number
}

type UnitPayload = {
  unitCode: string
  unitLabel: string
}

export type EstimateContentChangeInput =
  | { action: "create_section"; payload: { title: string; sortOrder?: number } }
  | {
      action: "update_section"
      payload: { sectionId: string; title?: string; sortOrder?: number }
    }
  | { action: "archive_section"; payload: { sectionId: string } }
  | { action: "reorder_sections"; payload: { items: SortItem[] } }
  | {
      action: "add_work_from_directory"
      payload: {
        sectionId: string
        directoryWorkId: string
        quantity?: number
        price?: number
        sortOrder?: number
      }
    }
  | {
      action: "add_manual_work"
      payload: UnitPayload & {
        sectionId: string
        title: string
        quantity?: number
        price?: number
        category?: string | null
        notes?: string | null
        sortOrder?: number
      }
    }
  | {
      action: "update_work"
      payload: {
        workId: string
        sectionId?: string
        title?: string
        quantity?: number
        price?: number
        factQuantity?: number
        factPrice?: number
        notes?: string | null
        sortOrder?: number
      }
    }
  | { action: "archive_work"; payload: { workId: string } }
  | {
      action: "reorder_works"
      payload: { sectionId: string; items: SortItem[] }
    }
  | {
      action: "move_work_to_section"
      payload: { workId: string; sectionId: string; sortOrder?: number }
    }
  | {
      action: "add_material_from_directory"
      payload: {
        workId: string
        directoryMaterialId: string
        quantity?: number
        consumption?: number | null
        price?: number
        sortOrder?: number
        changedField?: "quantity" | "consumption" | "price"
      }
    }
  | {
      action: "add_manual_material"
      payload: UnitPayload & {
        workId: string
        title: string
        quantity?: number
        consumption?: number | null
        price?: number
        supplierName?: string | null
        notes?: string | null
        sortOrder?: number
        changedField?: "quantity" | "consumption" | "price"
      }
    }
  | {
      action: "update_material"
      payload: {
        materialId: string
        workId?: string
        title?: string
        quantity?: number
        consumption?: number | null
        price?: number
        notes?: string | null
        sortOrder?: number
        changedField?: "quantity" | "consumption" | "price" | "workQuantity"
      }
    }
  | { action: "archive_material"; payload: { materialId: string } }
  | {
      action: "move_material_to_work"
      payload: { materialId: string; workId: string; sortOrder?: number }
    }

function appendParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined
) {
  if (value === undefined || value === "") return
  params.set(key, String(value))
}

function buildOptionsUrl(
  projectId: string,
  recordId: string,
  type: "work-options" | "material-options",
  query: EstimateContentOptionsParams = {}
) {
  const params = new URLSearchParams()
  appendParam(params, "q", query.q)
  appendParam(params, "limit", query.limit)
  appendParam(params, "cursor", query.cursor)

  const search = params.toString()
  const path = `/api/projects/${projectId}/estimate-records/${recordId}/${type}`
  return search ? `${path}?${search}` : path
}

const FETCH_RETRY_DELAY_MS = 800

async function fetchJson<T>(url: string, resource: string, init?: RequestInit) {
  const doFetch = async () => {
    const response = await fetch(url, {
      credentials: "include",
      ...init,
      headers: init?.body
        ? { "Content-Type": "application/json", ...init.headers }
        : init?.headers,
    })

    if (!response.ok) await throwProjectsApiError(response, resource)

    return response.json() as Promise<T>
  }

  try {
    return await doFetch()
  } catch (err) {
    // Only retry on network errors (TypeError), not on HTTP errors
    if (!(err instanceof TypeError)) throw err

    await new Promise((resolve) => setTimeout(resolve, FETCH_RETRY_DELAY_MS))
    return doFetch()
  }
}

export function fetchProjectEstimateContent({
  projectId,
  recordId,
}: {
  projectId: string
  recordId: string
}) {
  return fetchJson<ProjectEstimateContentResponse>(
    `/api/projects/${projectId}/estimate-records/${recordId}/content`,
    "загрузки сметы"
  )
}

export function applyProjectEstimateContentChange({
  projectId,
  recordId,
  input,
}: {
  projectId: string
  recordId: string
  input: EstimateContentChangeInput
}) {
  return fetchJson<ProjectEstimateContentResponse>(
    `/api/projects/${projectId}/estimate-records/${recordId}/changes`,
    "сохранения сметы",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  )
}

export function fetchProjectEstimateWorkCoefficient({
  projectId,
  recordId,
}: {
  projectId: string
  recordId: string
}) {
  return fetchJson<EstimateWorkCoefficientResponse>(
    `/api/projects/${projectId}/estimate-records/${recordId}/work-coefficient`,
    "загрузки коэффициента"
  )
}

export function applyProjectEstimateWorkCoefficient({
  projectId,
  recordId,
  coefficientPercent,
}: {
  projectId: string
  recordId: string
  coefficientPercent: number
}) {
  return fetchJson<ProjectEstimateContentResponse>(
    `/api/projects/${projectId}/estimate-records/${recordId}/work-coefficient`,
    "применения коэффициента",
    {
      method: "POST",
      body: JSON.stringify({ coefficientPercent }),
    }
  )
}

export function fetchProjectEstimateWorkOptions({
  projectId,
  recordId,
  params,
}: {
  projectId: string
  recordId: string
  params?: EstimateContentOptionsParams
}) {
  return fetchJson<ProjectEstimateOptionsResponse<ProjectEstimateOptionRow>>(
    buildOptionsUrl(projectId, recordId, "work-options", params),
    "справочника работ"
  )
}

export function fetchProjectEstimateMaterialOptions({
  projectId,
  recordId,
  params,
}: {
  projectId: string
  recordId: string
  params?: EstimateContentOptionsParams
}) {
  return fetchJson<
    ProjectEstimateOptionsResponse<ProjectEstimateMaterialOptionRow>
  >(
    buildOptionsUrl(projectId, recordId, "material-options", params),
    "справочника материалов"
  )
}

export function importProjectEstimateContent({
  projectId,
  recordId,
  rows,
}: {
  projectId: string
  recordId: string
  rows: any[]
}) {
  return fetchJson<any>(
    `/api/projects/${projectId}/estimate-records/${recordId}/import`,
    "импорта сметы",
    {
      method: "POST",
      body: JSON.stringify(rows),
    }
  )
}

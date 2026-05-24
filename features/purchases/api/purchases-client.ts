import type { PurchaseRow } from "@/types/purchase"

export type EstimatePurchasesParams = {
  estimateId: string
  projectId: string
  q?: string
}

export type EstimatePurchasesResponse = {
  data: PurchaseRow[]
}

async function fetchJson<T>(
  url: string,
  resource: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let message = `Не удалось загрузить ${resource}`
    let code = "REQUEST_FAILED"

    try {
      const body = (await response.json()) as {
        error?: { code?: string; message?: string }
      }
      message = body.error?.message ?? message
      code = body.error?.code ?? code
    } catch {
      // Keep default message when response body is not JSON
    }

    const error = new Error(message) as Error & {
      code: string
      status: number
    }
    error.code = code
    error.status = response.status
    throw error
  }

  return response.json() as Promise<T>
}

function buildUrl({
  projectId,
  estimateId,
  q,
}: EstimatePurchasesParams): string {
  const params = new URLSearchParams()
  if (q?.trim()) {
    params.set("q", q.trim())
  }

  const base = `/api/projects/${encodeURIComponent(projectId)}/estimate-records/${encodeURIComponent(estimateId)}/purchases`
  const search = params.toString()
  return search ? `${base}?${search}` : base
}

export function fetchEstimatePurchases(
  params: EstimatePurchasesParams
): Promise<EstimatePurchasesResponse> {
  return fetchJson<EstimatePurchasesResponse>(
    buildUrl(params),
    "закупок сметы"
  )
}

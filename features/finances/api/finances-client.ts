import type { FinancePayment } from "@/features/finances/types"

export type EstimatePaymentsParams = {
  estimateId: string
  projectId: string
}

export type EstimatePaymentsResponse = {
  data: FinancePayment[]
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

function buildUrl({ projectId, estimateId }: EstimatePaymentsParams): string {
  return `/api/projects/${encodeURIComponent(projectId)}/estimate-records/${encodeURIComponent(estimateId)}/payments`
}

function buildPaymentUrl(
  projectId: string,
  estimateId: string,
  paymentId: string
): string {
  return `/api/projects/${encodeURIComponent(projectId)}/estimate-records/${encodeURIComponent(estimateId)}/payments/${encodeURIComponent(paymentId)}`
}

export function fetchEstimatePayments(
  params: EstimatePaymentsParams
): Promise<EstimatePaymentsResponse> {
  return fetchJson<EstimatePaymentsResponse>(buildUrl(params), "платежи сметы")
}

export function addProjectEstimatePayment(
  projectId: string,
  estimateId: string,
  input: Omit<FinancePayment, "paymentId">
): Promise<{ data: FinancePayment }> {
  return fetchJson<{ data: FinancePayment }>(
    `/api/projects/${encodeURIComponent(projectId)}/estimate-records/${encodeURIComponent(estimateId)}/payments`,
    "создание платежа",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
}

export function updateProjectEstimatePayment(
  projectId: string,
  estimateId: string,
  paymentId: string,
  input: Partial<Omit<FinancePayment, "paymentId">>
): Promise<{ data: FinancePayment }> {
  return fetchJson<{ data: FinancePayment }>(
    buildPaymentUrl(projectId, estimateId, paymentId),
    "обновление платежа",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  )
}

export function deleteProjectEstimatePayment(
  projectId: string,
  estimateId: string,
  paymentId: string
): Promise<{ success: boolean }> {
  return fetchJson<{ success: boolean }>(
    buildPaymentUrl(projectId, estimateId, paymentId),
    "удаление платежа",
    {
      method: "DELETE",
    }
  )
}

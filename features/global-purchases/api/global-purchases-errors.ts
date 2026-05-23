export class GlobalPurchasesApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message)
    this.name = "GlobalPurchasesApiError"
  }
}

export async function throwGlobalPurchasesApiError(
  response: Response,
  resource: string
) {
  let message = `Не удалось загрузить ${resource}`
  let code = "REQUEST_FAILED"

  try {
    const body = (await response.json()) as {
      error?: { code?: string; message?: string }
    }
    message = body.error?.message || message
    code = body.error?.code || code
  } catch {
    // Keep default message when response body is not JSON.
  }

  throw new GlobalPurchasesApiError(code, message, response.status)
}

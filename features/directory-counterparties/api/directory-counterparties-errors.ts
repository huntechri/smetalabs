export type DirectoryCounterpartiesApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INTERNAL_ERROR"

export class DirectoryCounterpartiesApiError extends Error {
  constructor(
    public readonly code: DirectoryCounterpartiesApiErrorCode,
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = "DirectoryCounterpartiesApiError"
  }
}

export async function getDirectoryCounterpartiesApiMessage(response: Response) {
  const fallback = `Ошибка API справочника контрагентов: ${response.status}`

  try {
    const json = (await response.json()) as {
      error?: { message?: string } | string
    }

    if (typeof json.error === "string") return json.error
    return json.error?.message ?? fallback
  } catch {
    return fallback
  }
}

export async function throwDirectoryCounterpartiesApiError(
  response: Response,
  resource = "справочника контрагентов"
): Promise<never> {
  const message = await getDirectoryCounterpartiesApiMessage(response)
  throw new Error(message || `Ошибка загрузки ${resource}`)
}

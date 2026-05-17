export type DirectorySuppliersApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INTERNAL_ERROR"

export class DirectorySuppliersApiError extends Error {
  constructor(
    public readonly code: DirectorySuppliersApiErrorCode,
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = "DirectorySuppliersApiError"
  }
}

export async function getDirectorySuppliersApiMessage(response: Response) {
  const fallback = `Ошибка API справочника поставщиков: ${response.status}`

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

export async function throwDirectorySuppliersApiError(
  response: Response,
  resource = "справочника поставщиков"
): Promise<never> {
  const message = await getDirectorySuppliersApiMessage(response)
  throw new Error(message || `Ошибка загрузки ${resource}`)
}

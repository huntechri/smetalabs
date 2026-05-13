export type DirectoryWorksApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INTERNAL_ERROR"

export class DirectoryWorksApiError extends Error {
  constructor(
    public readonly code: DirectoryWorksApiErrorCode,
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = "DirectoryWorksApiError"
  }
}

export async function getDirectoryWorksApiMessage(response: Response) {
  const fallback = `Ошибка API справочника работ: ${response.status}`

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

export async function throwDirectoryWorksApiError(
  response: Response,
  resource = "справочника работ"
): Promise<never> {
  const message = await getDirectoryWorksApiMessage(response)
  throw new Error(message || `Ошибка загрузки ${resource}`)
}

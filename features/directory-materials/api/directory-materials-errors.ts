export type DirectoryMaterialsApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INTERNAL_ERROR"

export class DirectoryMaterialsApiError extends Error {
  constructor(
    public readonly code: DirectoryMaterialsApiErrorCode,
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = "DirectoryMaterialsApiError"
  }
}

export async function getDirectoryMaterialsApiMessage(response: Response) {
  const fallback = `Ошибка API справочника материалов: ${response.status}`

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

export async function throwDirectoryMaterialsApiError(
  response: Response,
  resource = "справочника материалов"
): Promise<never> {
  const message = await getDirectoryMaterialsApiMessage(response)
  throw new Error(message || `Ошибка загрузки ${resource}`)
}

export class ProjectsApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 500
  ) {
    super(message)
    this.name = "ProjectsApiError"
  }
}

type ApiErrorPayload = {
  error?: {
    code?: string
    message?: string
  }
}

async function readErrorPayload(
  response: Response
): Promise<ApiErrorPayload | null> {
  try {
    return (await response.json()) as ApiErrorPayload
  } catch {
    return null
  }
}

export async function throwProjectsApiError(
  response: Response,
  resource: string
): Promise<never> {
  const payload = await readErrorPayload(response)
  const message =
    payload?.error?.message ?? `Не удалось выполнить действие для ${resource}`

  throw new ProjectsApiError(
    payload?.error?.code ?? "REQUEST_FAILED",
    message,
    response.status
  )
}

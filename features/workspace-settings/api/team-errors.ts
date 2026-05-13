export function getApiMessage(body: unknown) {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return ""
  }

  const error = (body as { error?: { message?: unknown } }).error
  return typeof error?.message === "string" ? error.message : ""
}

export async function getResponseApiMessage(response: Response) {
  try {
    return getApiMessage(await response.json())
  } catch {
    return ""
  }
}

/**
 * Преобразует HTTP-статус + сообщение от API в понятный пользователю текст ошибки.
 */
export function resolveFetchError(
  status: number,
  apiMessage: string,
  resource: string
): string {
  switch (status) {
    case 401:
      return "Необходимо войти в систему"
    case 403:
      return "Недостаточно прав для доступа"
    case 404:
      return `API для ${resource} не найден`
    case 409:
      return apiMessage || `Конфликт: ${resource}`
    case 500:
      return `Ошибка сервера при загрузке ${resource}${apiMessage ? `: ${apiMessage}` : ""}`
    default:
      return `Ошибка загрузки ${resource} (${status})${apiMessage ? `: ${apiMessage}` : ""}`
  }
}

export async function throwTeamApiError(response: Response, resource: string) {
  const apiMessage = await getResponseApiMessage(response)
  throw new Error(resolveFetchError(response.status, apiMessage, resource))
}

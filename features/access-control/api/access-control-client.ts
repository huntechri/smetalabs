import type { ApiRole } from "../hooks/use-access-control"

function resolveFetchError(status: number, apiMessage: string, resource: string) {
  switch (status) {
    case 401:
      return "Необходимо войти в систему"
    case 403:
      return "Недостаточно прав для доступа"
    case 404:
      return `API для ${resource} не найден`
    case 500:
      return `Ошибка сервера при загрузке ${resource}${apiMessage ? `: ${apiMessage}` : ""}`
    default:
      return `Ошибка загрузки ${resource} (${status})${apiMessage ? `: ${apiMessage}` : ""}`
  }
}

export async function fetchAccessRoles() {
  const res = await fetch("/api/access-control/roles", {
    credentials: "include",
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const apiMessage = body?.error?.message ?? ""
    console.error(
      `[useRoles] fetch failed: ${res.status} ${res.statusText}`,
      apiMessage || "(no body)"
    )
    throw new Error(resolveFetchError(res.status, apiMessage, "ролей"))
  }

  const json = await res.json()
  return json.data as ApiRole[]
}

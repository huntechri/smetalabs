import type { Role } from "@/types/roles"
import type {
  AllowedDomain,
  WorkspaceInvitation,
  WorkspaceOverview,
} from "../types"
import { getApiMessage, throwTeamApiError } from "./team-errors"
import { mapApiMember, type ApiMember } from "./team-mappers"

async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

async function fetchJson<T>(url: string, resource: string, init?: RequestInit) {
  const response = await fetch(url, {
    credentials: "include",
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...init.headers }
      : init?.headers,
  })

  if (!response.ok) {
    await throwTeamApiError(response, resource)
  }

  return readJson<T>(response)
}

export async function fetchWorkspaceMembers() {
  const json = await fetchJson<{ data: ApiMember[] }>(
    "/api/team/members",
    "участников"
  )
  return json.data.map(mapApiMember)
}

export async function mutateWorkspaceMember(
  userId: string,
  method: "PATCH" | "DELETE" | "POST",
  body?: Record<string, unknown>,
  pathSuffix = ""
) {
  const response = await fetch(`/api/team/members/${userId}${pathSuffix}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    await throwTeamApiError(response, "участника")
  }

  return response.json().catch(() => ({ success: true }))
}

export function updateWorkspaceMemberRole(userId: string, newRole: Role) {
  return mutateWorkspaceMember(userId, "PATCH", { role: newRole })
}

export function updateWorkspaceMemberSuspension(
  userId: string,
  suspend: boolean
) {
  return mutateWorkspaceMember(userId, "PATCH", {
    status: suspend ? "suspended" : "active",
  })
}

export function deleteWorkspaceMember(userId: string) {
  return mutateWorkspaceMember(userId, "DELETE")
}

export function sendWorkspaceMemberPasswordReset(userId: string) {
  return mutateWorkspaceMember(userId, "POST", undefined, "/reset-password")
}

export async function fetchWorkspaceOverview() {
  const json = await fetchJson<{ data: WorkspaceOverview }>(
    "/api/team/overview",
    "обзора workspace"
  )
  return json.data
}

export async function createWorkspaceInvitation(
  email: string,
  role: string,
  message?: string
): Promise<{ data: WorkspaceInvitation; warning: string | null }> {
  const json = await fetchJson<{
    data: WorkspaceInvitation
    meta?: { emailSent?: boolean; emailError?: string }
  }>("/api/team/invitations", "приглашения", {
    method: "POST",
    body: JSON.stringify({ email, role, message }),
  })

  const warning =
    !json.meta?.emailSent && json.meta?.emailError
      ? `Приглашение сохранено, но письмо не отправлено: ${json.meta.emailError}`
      : null

  return { data: json.data, warning }
}

export async function fetchWorkspaceInvitations() {
  const json = await fetchJson<{ data?: WorkspaceInvitation[] }>(
    "/api/team/invitations",
    "приглашений"
  )
  return json.data ?? []
}

export async function cancelWorkspaceInvitation(id: string) {
  await fetchJson(`/api/team/invitations/${id}`, "отзыва приглашения", {
    method: "DELETE",
  })
}

export async function resendWorkspaceInvitation(id: string) {
  const response = await fetch(`/api/team/invitations/${id}/resend`, {
    method: "POST",
    credentials: "include",
  })
  const json = await response.json()

  if (!response.ok) {
    const errorMessage =
      typeof json.error === "string" ? json.error : json.error?.message
    throw new Error(errorMessage || "Ошибка повторной отправки")
  }

  return json
}

export async function fetchWorkspaceDomains() {
  const json = await fetchJson<{
    data?: AllowedDomain[]
    meta?: { autoJoinDomains?: boolean }
  }>("/api/team/domains", "доменов")

  return {
    domains: json.data ?? [],
    autoJoin: json.meta?.autoJoinDomains ?? false,
  }
}

export async function createWorkspaceDomain(domain: string) {
  const json = await fetchJson<{ data: AllowedDomain }>(
    "/api/team/domains",
    "добавления домена",
    {
      method: "POST",
      body: JSON.stringify({ domain }),
    }
  )
  return json.data
}

export async function deleteWorkspaceDomain(id: string) {
  await fetchJson(`/api/team/domains/${id}`, "удаления домена", {
    method: "DELETE",
  })
}

export async function updateWorkspaceAutoJoinDomains(value: boolean) {
  await fetchJson("/api/team/domains", "настройки auto-join", {
    method: "PATCH",
    body: JSON.stringify({ autoJoinDomains: value }),
  })
}

export async function fetchWorkspaceInviteLink() {
  const json = await fetchJson<{
    data: { enabled: boolean; url: string | null; defaultRole: string }
  }>("/api/team/invite-link", "ссылки")
  return json.data
}

export async function patchWorkspaceInviteLink(updates: {
  enabled?: boolean
  defaultRole?: string
}) {
  const json = await fetchJson<{
    data: { enabled: boolean; url: string | null; defaultRole: string }
  }>("/api/team/invite-link", "обновления ссылки", {
    method: "PATCH",
    body: JSON.stringify(updates),
  })
  return json.data
}

export { getApiMessage }

import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface ClientNotification {
  id: string
  recipient_id: string
  workspace_owner_id: string
  actor_id: string | null
  type: string
  title: string
  body: string
  link: string | null
  metadata: Record<string, unknown>
  read_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface NotificationsResponse {
  data: {
    notifications: ClientNotification[]
    unreadCount: number
    hasMore: boolean
  }
}

export interface SuccessResponse {
  data: {
    success: boolean
  }
}

export type NotificationsRealtimeSubscription = {
  unsubscribe: () => void
}

/**
 * Получение списка уведомлений с бэкенда.
 */
export async function fetchNotifications(
  filters: {
    unreadOnly?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<NotificationsResponse["data"]> {
  const params = new URLSearchParams()
  if (filters.unreadOnly !== undefined) {
    params.set("unreadOnly", String(filters.unreadOnly))
  }
  if (filters.limit !== undefined) {
    params.set("limit", String(filters.limit))
  }
  if (filters.offset !== undefined) {
    params.set("offset", String(filters.offset))
  }

  const res = await fetch(`/api/notifications?${params.toString()}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error?.message ?? `Ошибка загрузки: ${res.status}`)
  }

  const json: NotificationsResponse = await res.json()
  return json.data
}

/**
 * Отметка уведомлений как прочитанных.
 */
export async function markNotificationsRead(params: {
  ids?: string[]
  all?: boolean
}): Promise<boolean> {
  const res = await fetch("/api/notifications/read", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      body?.error?.message ?? `Ошибка при сохранении: ${res.status}`
    )
  }

  const json: SuccessResponse = await res.json()
  return json.data.success
}

/**
 * Перенос уведомлений в архив.
 */
export async function archiveNotifications(params: {
  ids?: string[]
  all?: boolean
}): Promise<boolean> {
  const res = await fetch("/api/notifications/archive", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(
      body?.error?.message ?? `Ошибка при архивации: ${res.status}`
    )
  }

  const json: SuccessResponse = await res.json()
  return json.data.success
}

export async function subscribeToNotificationsRealtime(
  onInsert: (notification: ClientNotification) => void
): Promise<NotificationsRealtimeSubscription> {
  const supabase = createClient()
  let activeChannel: RealtimeChannel | null = null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      unsubscribe: () => {},
    }
  }

  activeChannel = supabase
    .channel(`realtime-notifications-${user.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${user.id}`,
      },
      (payload) => {
        onInsert(payload.new as ClientNotification)
      }
    )
    .subscribe()

  return {
    unsubscribe: () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
    },
  }
}

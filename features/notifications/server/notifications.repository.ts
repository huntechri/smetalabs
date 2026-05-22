import { supabase } from "@/db"

export interface DbNotification {
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

export interface InsertNotificationParams {
  recipientId: string
  workspaceOwnerId: string
  actorId?: string | null
  type: string
  title: string
  body: string
  link?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Получение активных уведомлений пользователя (archived_at IS NULL).
 */
export async function getUserNotifications(
  userId: string,
  filters: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
): Promise<DbNotification[]> {
  const { unreadOnly = false, limit = 20, offset = 0 } = filters

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (unreadOnly) {
    query = query.is("read_at", null)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as DbNotification[]
}

/**
 * Получение количества непрочитанных уведомлений.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("archived_at", null)
    .is("read_at", null)

  if (error) throw error
  return count || 0
}

/**
 * Отметка уведомлений как прочитанных.
 */
export async function markAsRead(
  userId: string,
  ids?: string[],
  markAll: boolean = false
): Promise<void> {
  const now = new Date().toISOString()

  let query = supabase
    .from("notifications")
    .update({ read_at: now, updated_at: now })
    .eq("recipient_id", userId)
    .is("read_at", null)
    .is("archived_at", null)

  if (!markAll && ids && ids.length > 0) {
    query = query.in("id", ids)
  } else if (!markAll) {
    // Если не markAll и список ids пуст, ничего не делаем
    return
  }

  const { error } = await query
  if (error) throw error
}

/**
 * Перенос уведомлений в архив (мягкое удаление).
 */
export async function archiveNotifications(
  userId: string,
  ids?: string[],
  archiveAll: boolean = false
): Promise<void> {
  const now = new Date().toISOString()

  let query = supabase
    .from("notifications")
    .update({ archived_at: now, updated_at: now })
    .eq("recipient_id", userId)
    .is("archived_at", null)

  if (!archiveAll && ids && ids.length > 0) {
    query = query.in("id", ids)
  } else if (!archiveAll) {
    return
  }

  const { error } = await query
  if (error) throw error
}

/**
 * Создание уведомления в БД.
 */
export async function insertNotification(
  params: InsertNotificationParams
): Promise<DbNotification> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      recipient_id: params.recipientId,
      workspace_owner_id: params.workspaceOwnerId,
      actor_id: params.actorId || null,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link || null,
      metadata: params.metadata || {},
    })
    .select()
    .single()

  if (error) throw error
  return data as DbNotification
}

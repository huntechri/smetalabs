import { useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  fetchNotifications,
  markNotificationsRead,
  archiveNotifications,
  subscribeToNotificationsRealtime,
} from "../api/notifications-client"
import { notificationsQueryKeys } from "../api/notifications-query-keys"

/**
 * Хук для получения списка уведомлений.
 */
export function useNotifications(
  filters: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
) {
  return useQuery({
    queryKey: notificationsQueryKeys.list(filters),
    queryFn: () => fetchNotifications(filters),
  })
}

/**
 * Хук для получения числа непрочитанных.
 */
export function useNotificationsCount() {
  return useQuery({
    queryKey: notificationsQueryKeys.count(),
    queryFn: async () => {
      const data = await fetchNotifications({ unreadOnly: true, limit: 1 })
      return data.unreadCount
    },
  })
}

/**
 * Хук для отметки уведомлений как прочитанных.
 */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { ids?: string[]; all?: boolean }) =>
      markNotificationsRead(params),
    onSuccess: () => {
      // Инвалидируем все связанные запросы
      queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.all })
    },
    onError: (error: Error) => {
      toast.error(`Ошибка при прочтении: ${error.message}`)
    },
  })
}

/**
 * Хук для архивации уведомлений.
 */
export function useArchiveNotifications() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { ids?: string[]; all?: boolean }) =>
      archiveNotifications(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKeys.all })
    },
    onError: (error: Error) => {
      toast.error(`Ошибка при архивации: ${error.message}`)
    },
  })
}

/**
 * Хук для real-time подписки на новые уведомления.
 */
export function useNotificationsRealtime() {
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | null = null

    subscribeToNotificationsRealtime((newNotif) => {
      toast.info(newNotif.title, {
        description: newNotif.body,
        action: newNotif.link
          ? {
              label: "Перейти",
              onClick: () => {
                router.push(newNotif.link!)
              },
            }
          : undefined,
        duration: 8000,
      })

      queryClient.invalidateQueries({
        queryKey: notificationsQueryKeys.all,
      })
    })
      .then((subscription) => {
        if (cancelled) {
          subscription.unsubscribe()
          return
        }
        unsubscribe = subscription.unsubscribe
      })
      .catch((error: Error) => {
        console.error("Notifications realtime subscription failed", error)
      })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [queryClient, router])
}

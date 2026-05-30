import { useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"
import {
  fetchNotifications,
  markNotificationsRead,
  archiveNotifications,
  type ClientNotification,
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
  const supabase = createClient()

  useEffect(() => {
    let activeChannel: RealtimeChannel | null = null

    async function subscribe() {
      // Получаем id текущего аутентифицированного пользователя
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

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
            const newNotif = payload.new as ClientNotification

            // Отображаем красивый тост с кнопкой действия (если есть ссылка)
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

            // Инвалидируем кэш, чтобы обновить списки и счетчики
            queryClient.invalidateQueries({
              queryKey: notificationsQueryKeys.all,
            })
          }
        )
        .subscribe()
    }

    subscribe()

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
    }
  }, [queryClient, router, supabase])
}

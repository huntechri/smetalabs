"use client"

import React from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Briefcase,
  Calculator,
  ShoppingCart,
  Users,
  CreditCard,
  Trash,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { ClientNotification } from "../api/notifications-client"
import { useMarkNotificationsRead, useArchiveNotifications } from "../hooks/use-notifications"

interface NotificationItemProps {
  notification: ClientNotification
  onClosePopover?: () => void
}

/**
 * Простой хелпер для вычисления относительного времени на русском языке.
 */
export function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Только что"
  if (diffMins < 60) return `${diffMins} мин. назад`
  if (diffHours < 24) return `${diffHours} ч. назад`
  if (diffDays < 7) return `${diffDays} дн. назад`

  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
}

/**
 * Возвращает иконку и цвет фона в зависимости от типа уведомления.
 */
function getNotificationVisuals(type: string) {
  const baseIconClass = "size-4.5"
  
  if (type.startsWith("project_")) {
    return {
      icon: <Briefcase className={baseIconClass} />,
      bgClass: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20",
    }
  }
  if (type.startsWith("estimate_")) {
    return {
      icon: <Calculator className={baseIconClass} />,
      bgClass: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20",
    }
  }
  if (type.startsWith("procurement_")) {
    return {
      icon: <ShoppingCart className={baseIconClass} />,
      bgClass: "bg-amber-500/10 text-amber-500 dark:bg-amber-500/20",
    }
  }
  if (type.startsWith("team_")) {
    return {
      icon: <Users className={baseIconClass} />,
      bgClass: "bg-purple-500/10 text-purple-500 dark:bg-purple-500/20",
    }
  }
  if (type.startsWith("billing_")) {
    return {
      icon: <CreditCard className={baseIconClass} />,
      bgClass: "bg-rose-500/10 text-rose-500 dark:bg-rose-500/20",
    }
  }

  return {
    icon: <Bell className={baseIconClass} />,
    bgClass: "bg-muted text-muted-foreground",
  }
}

export function NotificationItem({ notification, onClosePopover }: NotificationItemProps) {
  const router = useRouter()
  const { mutate: markRead } = useMarkNotificationsRead()
  const { mutate: archive } = useArchiveNotifications()
  
  const isUnread = !notification.read_at
  const { icon, bgClass } = getNotificationVisuals(notification.type)

  const handleItemClick = () => {
    // 1. Помечаем как прочитанное
    if (isUnread) {
      markRead({ ids: [notification.id] })
    }
    
    // 2. Закрываем поповер
    onClosePopover?.()

    // 3. Переходим по ссылке
    if (notification.link) {
      router.push(notification.link)
    }
  }

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Предотвращаем срабатывание клика по карточке
    archive({ ids: [notification.id] })
  }

  return (
    <div
      onClick={handleItemClick}
      className={cn(
        "group relative flex cursor-pointer gap-3 border-b p-4 text-left transition-colors last:border-0 hover:bg-muted/50",
        isUnread ? "bg-muted/20" : "bg-transparent"
      )}
    >
      {/* Иконка уведомления */}
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", bgClass)}>
        {icon}
      </div>

      {/* Контент уведомления */}
      <div className="flex flex-1 flex-col gap-1 pr-6">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn("text-xs font-semibold text-foreground line-clamp-1", isUnread && "text-primary font-bold")}>
            {notification.title}
          </span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>
        <p className={cn("text-xs text-muted-foreground line-clamp-2 leading-relaxed", isUnread && "text-foreground/80")}>
          {notification.body}
        </p>
      </div>

      {/* Индикатор непрочитанного и кнопка архивации */}
      <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {isUnread && (
          <span className="h-2 w-2 rounded-full bg-primary transition-opacity group-hover:opacity-0" />
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleArchiveClick}
          className="h-7 w-7 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          title="В архив"
        >
          <Trash className="size-4" />
        </Button>
      </div>
    </div>
  )
}

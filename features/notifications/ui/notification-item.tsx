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
import {
  useMarkNotificationsRead,
  useArchiveNotifications,
} from "../application/use-notifications"
import {
  getNotificationVisualType,
  formatRelativeTime,
  type NotificationIconType,
} from "../model/notifications-model"

interface NotificationItemProps {
  notification: ClientNotification
  onClosePopover?: () => void
}

function renderIcon(iconType: NotificationIconType, className: string) {
  switch (iconType) {
    case "briefcase":
      return <Briefcase className={className} />
    case "calculator":
      return <Calculator className={className} />
    case "shopping-cart":
      return <ShoppingCart className={className} />
    case "users":
      return <Users className={className} />
    case "credit-card":
      return <CreditCard className={className} />
    default:
      return <Bell className={className} />
  }
}

export function NotificationItem({
  notification,
  onClosePopover,
}: NotificationItemProps) {
  const router = useRouter()
  const { mutate: markRead } = useMarkNotificationsRead()
  const { mutate: archive } = useArchiveNotifications()

  const isUnread = !notification.read_at
  const { iconType, bgClass } = getNotificationVisualType(notification.type)

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
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          bgClass
        )}
      >
        {renderIcon(iconType, "size-4.5")}
      </div>

      {/* Контент уведомления */}
      <div className="flex flex-1 flex-col gap-1 pr-6">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "line-clamp-1 text-xs font-semibold text-foreground",
              isUnread && "font-bold text-primary"
            )}
          >
            {notification.title}
          </span>
          <span className="text-[10px] whitespace-nowrap text-muted-foreground">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>
        <p
          className={cn(
            "line-clamp-2 text-xs leading-relaxed text-muted-foreground",
            isUnread && "text-foreground/80"
          )}
        >
          {notification.body}
        </p>
      </div>

      {/* Индикатор непрочитанного и кнопка архивации */}
      <div className="absolute top-1/2 right-4 flex -translate-y-1/2 items-center gap-1">
        {isUnread && (
          <span className="h-2 w-2 rounded-full bg-primary transition-opacity group-hover:opacity-0" />
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={handleArchiveClick}
          className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
          title="В архив"
        >
          <Trash className="size-4" />
        </Button>
      </div>
    </div>
  )
}

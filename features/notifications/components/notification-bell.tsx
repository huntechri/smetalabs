"use client"

import React, { useState } from "react"
import { Bell } from "@phosphor-icons/react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { NotificationList } from "./notification-list"
import {
  useNotificationsCount,
  useNotificationsRealtime,
} from "../hooks/use-notifications"

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { data: unreadCount = 0 } = useNotificationsCount()

  // Инициализируем Supabase Realtime прослушивание
  useNotificationsRealtime()

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 hover:bg-muted focus-visible:ring-0 focus-visible:ring-offset-0"
          aria-label="Уведомления"
        >
          <Bell className="size-5 text-foreground" />

          {/* Индикатор количества непрочитанных */}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 animate-in items-center justify-center rounded-full bg-primary px-1 text-[9px] leading-none font-bold text-primary-foreground duration-200 fade-in zoom-in">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      {/* Контент с выравниванием по правому краю */}
      <PopoverContent
        align="end"
        className="w-auto border p-0 shadow-lg"
        sideOffset={8}
      >
        <NotificationList onClosePopover={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}

"use client"

import React, { useState } from "react"
import { Bell } from "@phosphor-icons/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { NotificationList } from "./notification-list"
import { useNotificationsCount, useNotificationsRealtime } from "../hooks/use-notifications"

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
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground leading-none animate-in fade-in zoom-in duration-200">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      {/* Контент с выравниванием по правому краю */}
      <PopoverContent align="end" className="w-auto p-0 border shadow-lg" sideOffset={8}>
        <NotificationList onClosePopover={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}

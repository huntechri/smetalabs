"use client"

import React, { useState } from "react"
import Link from "next/link"
import { BellSlash, Checks, Gear } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NotificationItem } from "./notification-item"
import {
  useNotifications,
  useMarkNotificationsRead,
} from "../application/use-notifications"

interface NotificationListProps {
  onClosePopover?: () => void
}

export function NotificationList({ onClosePopover }: NotificationListProps) {
  const [activeTab, setActiveTab] = useState<"all" | "unread">("unread")

  // Загружаем данные в зависимости от активной вкладки
  const { data, isLoading } = useNotifications({
    unreadOnly: activeTab === "unread",
    limit: 20,
  })

  const { mutate: markAllRead, isPending: isMarking } =
    useMarkNotificationsRead()

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount ?? 0

  const handleMarkAllRead = () => {
    markAllRead({ all: true })
  }

  return (
    <div className="flex w-80 flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground sm:w-96">
      {/* Шапка списка */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
        <h3 className="font-heading text-sm font-semibold tracking-tight">
          Уведомления
        </h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isMarking}
            className="h-8 gap-1 text-xs font-normal text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Checks className="size-4" />
            Прочитать все
          </Button>
        )}
      </div>

      {/* Табы */}
      <div className="border-b bg-muted/10 px-4 py-2">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "all" | "unread")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unread" className="text-xs">
              Непрочитанные
              {unreadCount > 0 && (
                <span className="ml-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs">
              Все
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Контент списка */}
      <div className="flex max-h-[350px] min-h-[150px] flex-col overflow-y-auto">
        {isLoading ? (
          // Скелетон загрузки
          <div className="flex flex-col">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 border-b p-4 last:border-0">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="flex flex-1 flex-col gap-1.5 pr-6">
                  <div className="flex justify-between gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2 w-10" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          // Пустое состояние
          <div className="flex flex-1 items-center justify-center px-4 py-10">
            <Empty className="border-0 p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BellSlash className="size-5 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle className="text-xs font-semibold">
                  Нет уведомлений
                </EmptyTitle>
                <EmptyDescription className="max-w-[240px] text-[11px] leading-normal">
                  {activeTab === "unread"
                    ? "У вас нет непрочитанных уведомлений"
                    : "Здесь будут отображаться новые события"}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        ) : (
          // Список элементов
          <div className="flex flex-col divide-y">
            {notifications.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onClosePopover={onClosePopover}
              />
            ))}
          </div>
        )}
      </div>

      {/* Футер со ссылкой на настройки */}
      <div className="border-t bg-muted/30 px-4 py-2.5 text-center">
        <Link
          href="/settings/account"
          onClick={onClosePopover}
          className="inline-flex items-center gap-1.5 text-xs font-normal text-muted-foreground transition-colors hover:text-foreground"
        >
          <Gear className="size-4" />
          Настройки уведомлений
        </Link>
      </div>
    </div>
  )
}

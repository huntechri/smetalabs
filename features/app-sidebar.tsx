"use client"

import * as React from "react"
import {
  Command,
  Files,
  FolderSimple,
  Folders,
  Package,
  SquaresFour,
  Users,
} from "@phosphor-icons/react"

import { NavMain } from "@/features/nav-main"
import { NavUser, type NavUserData } from "@/features/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Дашборд",
      url: "/dashboard",
      icon: <SquaresFour />,
      isActive: true,
    },
    {
      title: "Проекты",
      url: "/projects",
      icon: <FolderSimple />,
    },
    {
      title: "Закупки",
      url: "/procurements",
      icon: <Package />,
    },
    {
      title: "Команда",
      url: "/team",
      icon: <Users />,
    },
    {
      title: "Справочники",
      url: "/directories",
      icon: <Folders />,
      items: [
        {
          title: "Контрагенты",
          url: "/directories/counterparties",
        },
        {
          title: "Материалы",
          url: "/directories/materials",
        },
        {
          title: "Поставщики",
          url: "/directories/suppliers",
        },
        {
          title: "Работы",
          url: "/directories/works",
        },
      ],
    },
    {
      title: "Шаблоны",
      url: "/templates",
      icon: <Files />,
    },
  ],
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user?: NavUserData
}

const fallbackUser: NavUserData = {
  name: "Пользователь",
  email: "",
  avatar: null,
}

export function AppSidebar({ user = fallbackUser, ...props }: AppSidebarProps) {
  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">SmetaLab</span>
                  <span className="truncate text-xs">SaaS-платформа</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}

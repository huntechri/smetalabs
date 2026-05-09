"use client"

import * as React from "react"

import { NavMain } from "@/features/nav-main"
import { NavProjects } from "@/features/nav-projects"
import { NavSecondary } from "@/features/nav-secondary"
import { NavUser } from "@/features/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  SquaresFour,
  FolderSimple,
  Package,
  Users,
  Folders,
  Files,
  SignOut,
  User,
  Command,
  CaretRight
} from "@phosphor-icons/react"

const data = {
  user: {
    name: "Admin",
    email: "admin@smetalabs.com",
    avatar: "/avatars/admin.png",
  },
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">SmetaLab</span>
                  <span className="truncate text-xs">SaaS Платформа</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* Projects and Secondary sections removed, all paths are now in NavMain */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

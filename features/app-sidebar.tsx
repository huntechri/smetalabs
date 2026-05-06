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
      title: "Dashboard",
      url: "/dashboard",
      icon: <SquaresFour />,
      isActive: true,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: <FolderSimple />,
    },
    {
      title: "Procurements",
      url: "/procurements",
      icon: <Package />,
    },
    {
      title: "Team",
      url: "/team",
      icon: <Users />,
    },
    {
      title: "Directories",
      url: "/directories",
      icon: <Folders />,
      items: [
        {
          title: "Counterparties",
          url: "/directories/counterparties",
        },
        {
          title: "Materials",
          url: "/directories/materials",
        },
        {
          title: "Suppliers",
          url: "/directories/suppliers",
        },
        {
          title: "Works",
          url: "/directories/works",
        },
      ],
    },
    {
      title: "Templates",
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
                  <span className="truncate text-xs">SaaS Platform</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* Секции Projects и Secondary убраны, так как все пути теперь в NavMain */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}

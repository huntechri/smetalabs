import { AppSidebar } from "@/features/app-sidebar"
import { SiteHeader } from "@/features/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-svh overflow-hidden [--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex h-full min-h-0 flex-col">
        <SiteHeader />
        <div className="flex h-[calc(100svh-var(--header-height))] min-h-0">
          <AppSidebar />
          <SidebarInset className="min-h-0 overflow-hidden">
            {/* Сюда Next.js будет подставлять контент из /dashboard, /projects и т.д. */}
            {children}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}

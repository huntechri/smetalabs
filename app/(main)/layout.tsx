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
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            {/* Сюда Next.js будет подставлять контент из /dashboard, /projects и т.д. */}
            {children}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}

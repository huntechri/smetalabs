import { AppSidebar } from "@/features/app-sidebar"
import { SiteHeader } from "@/features/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/server"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user

  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "Пользователь"

  return (
    <div className="h-svh overflow-hidden [--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex h-full min-h-0 flex-col">
        <SiteHeader />
        <div className="flex h-[calc(100svh-var(--header-height))] min-h-0">
          <AppSidebar
            user={{
              name: displayName,
              email: user?.email ?? "",
              avatar: user?.user_metadata?.avatar_url ?? null,
            }}
          />
          <SidebarInset className="min-h-0 overflow-y-auto">
            {/* Сюда Next.js будет подставлять контент из /dashboard, /projects и т.д. */}
            {children}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}

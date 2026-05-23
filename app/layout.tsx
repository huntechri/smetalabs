import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AppQueryProvider } from "@/components/query-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" suppressHydrationWarning className="font-sans antialiased">
      <body>
        <ThemeProvider>
          <AppQueryProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster />
          </AppQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

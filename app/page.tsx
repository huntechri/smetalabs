import Link from "next/link"
import { Button } from "@/components/ui/button"

const estimateLinks = [
  { emoji: "📊", label: "Estimate", href: "/projects/1/estimates/1" },
  { emoji: "🛒", label: "Purchases", href: "/projects/1/estimates/1/purchases" },
  { emoji: "⚙️", label: "Execution", href: "/projects/1/estimates/1/execution" },
  { emoji: "💰", label: "Finances", href: "/projects/1/estimates/1/finances" },
  { emoji: "📄", label: "Documents", href: "/projects/1/estimates/1/documents" },
]

const pageLinks = [
  { emoji: "🏠", label: "Dashboard", href: "/dashboard" },
  { emoji: "📁", label: "Projects", href: "/projects" },
  { emoji: "👥", label: "Team", href: "/team" },
  { emoji: "📋", label: "Templates", href: "/templates" },
  { emoji: "📦", label: "Directories", href: "/directories/materials" },
  { emoji: "🌍", label: "Global Purchases", href: "/procurements" },
]

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">🧭 Dev Navigation</h1>

      <div className="flex flex-col gap-6">
        <section>
          <h2 className="mb-3 text-center text-sm font-medium text-muted-foreground">
            Estimates
          </h2>
          <div className="flex flex-col gap-2">
            {estimateLinks.map((link) => (
              <Button key={link.href} variant="outline" size="lg" asChild>
                <Link href={link.href}>
                  {link.emoji} {link.label}
                </Link>
              </Button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-center text-sm font-medium text-muted-foreground">
            Pages
          </h2>
          <div className="flex flex-col gap-2">
            {pageLinks.map((link) => (
              <Button key={link.href} variant="outline" size="lg" asChild>
                <Link href={link.href}>
                  {link.emoji} {link.label}
                </Link>
              </Button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

import Link from "next/link"
import { Button } from "@/components/ui/button"

const estimateLinks = [
  { emoji: "📊", label: "Смета", href: "/projects/1/estimates/1" },
  { emoji: "🛒", label: "Закупки", href: "/projects/1/estimates/1/purchases" },
  { emoji: "⚙️", label: "Исполнение", href: "/projects/1/estimates/1/execution" },
  { emoji: "💰", label: "Финансы", href: "/projects/1/estimates/1/finances" },
  { emoji: "📄", label: "Документы", href: "/projects/1/estimates/1/documents" },
]

const pageLinks = [
  { emoji: "🏠", label: "Дашборд", href: "/dashboard" },
  { emoji: "📁", label: "Проекты", href: "/projects" },
  { emoji: "👥", label: "Команда", href: "/team" },
  { emoji: "📋", label: "Шаблоны", href: "/templates" },
  { emoji: "📦", label: "Справочники", href: "/directories/materials" },
  { emoji: "🌍", label: "Глобальные закупки", href: "/procurements" },
]

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">🧭 Навигация разработчика</h1>

      <div className="flex flex-col gap-6">
        <section>
          <h2 className="mb-3 text-center text-sm font-medium text-muted-foreground">
            Сметы
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
            Страницы
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

import type { FinanceSection, SectionStatus } from "@/features/finances/types"

/** Вычисляет сумму проведённых и в обработке платежей для секции */
export function getSectionFactAmount(section: FinanceSection): number {
  return section.payments
    .filter((p) => !p.isDeleting && (p.status === "conducted" || p.status === "processing"))
    .reduce((sum, p) => sum + p.amount, 0)
}

/** Определяет статус секции на основе план/факт */
export function getSectionStatus(section: FinanceSection): SectionStatus {
  const fact = getSectionFactAmount(section)
  if (fact === 0) return "unpaid"
  if (fact > section.planAmount) return "overpaid"
  if (fact >= section.planAmount) return "paid"
  return "partial"
}

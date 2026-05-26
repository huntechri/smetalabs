import type { FinanceSection, SectionStatus } from "@/features/finances/types"
import { getSectionFactAmount, getSectionStatus } from "@/features/finances/lib/utils"

export function buildSectionViewModel(section: FinanceSection): {
  factAmount: number
  isGeneral: boolean
  expenses: number
  balance: number
  percent: number
  status: SectionStatus
  customLabelMap?: Record<string, string>
} {
  const factAmount = getSectionFactAmount(section)
  const isGeneral = section.sectionId === "general_advance"
  const expenses = section.expenses ?? 0
  const balance = section.balance ?? 0
  const percent =
    section.planAmount > 0
      ? Math.round((factAmount / section.planAmount) * 100)
      : 0
  const status = isGeneral
    ? (factAmount > 0 ? "paid" : "unpaid")
    : getSectionStatus(section)

  return {
    factAmount,
    isGeneral,
    expenses,
    balance,
    percent,
    status,
    customLabelMap: isGeneral
      ? { paid: "Внесено", unpaid: "Не внесено" }
      : undefined,
  }
}

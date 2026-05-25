/**
 * Моковые данные для вкладки «Финансы».
 * Будет заменён на API-запросы после появления бэкенда.
 */

export type PaymentStatus = "conducted" | "processing" | "cancelled" | "expected"

export type SectionStatus =
  | "paid"
  | "partial"
  | "unpaid"
  | "overpaid"

export interface FinancePayment {
  paymentId: string
  sectionId: string
  date: string
  amount: number
  status: PaymentStatus
  purpose: string
}

export interface FinanceSection {
  sectionId: string
  title: string
  planAmount: number
  payments: FinancePayment[]
}

export const financeSections: FinanceSection[] = [
  {
    sectionId: "sec-1",
    title: "Раздел 1. Земляные работы",
    planAmount: 850_000,
    payments: [
      {
        paymentId: "pay-1-1",
        sectionId: "sec-1",
        date: "2026-04-05",
        amount: 500_000,
        status: "conducted",
        purpose: "Аванс 60% по договору №12/04",
      },
      {
        paymentId: "pay-1-2",
        sectionId: "sec-1",
        date: "2026-05-15",
        amount: 350_000,
        status: "conducted",
        purpose: "Окончательный расчёт по этапу",
      },
    ],
  },
  {
    sectionId: "sec-2",
    title: "Раздел 2. Фундамент",
    planAmount: 2_400_000,
    payments: [
      {
        paymentId: "pay-2-1",
        sectionId: "sec-2",
        date: "2026-04-20",
        amount: 1_200_000,
        status: "conducted",
        purpose: "Аванс 50% по договору №18/04",
      },
      {
        paymentId: "pay-2-2",
        sectionId: "sec-2",
        date: "2026-06-01",
        amount: 800_000,
        status: "processing",
        purpose: "Промежуточный платёж за бетонные работы",
      },
      {
        paymentId: "pay-2-3",
        sectionId: "sec-2",
        date: "2026-07-01",
        amount: 400_000,
        status: "expected",
        purpose: "Окончательный расчёт",
      },
    ],
  },
  {
    sectionId: "sec-3",
    title: "Раздел 3. Стены и перегородки",
    planAmount: 3_100_000,
    payments: [
      {
        paymentId: "pay-3-1",
        sectionId: "sec-3",
        date: "2026-05-10",
        amount: 1_550_000,
        status: "conducted",
        purpose: "Аванс 50% по договору №22/05",
      },
      {
        paymentId: "pay-3-2",
        sectionId: "sec-3",
        date: "2026-06-15",
        amount: 500_000,
        status: "cancelled",
        purpose: "Платёж отменён — замена подрядчика",
      },
      {
        paymentId: "pay-3-3",
        sectionId: "sec-3",
        date: "2026-06-20",
        amount: 550_000,
        status: "conducted",
        purpose: "Платёж новому подрядчику (взамен отменённого)",
      },
    ],
  },
  {
    sectionId: "sec-4",
    title: "Раздел 4. Кровля и фасад",
    planAmount: 1_750_000,
    payments: [
      {
        paymentId: "pay-4-1",
        sectionId: "sec-4",
        date: "2026-06-01",
        amount: 700_000,
        status: "conducted",
        purpose: "Аванс 40% по договору №30/05",
      },
      {
        paymentId: "pay-4-2",
        sectionId: "sec-4",
        date: "2026-07-15",
        amount: 1_050_000,
        status: "expected",
        purpose: "Окончательный расчёт после приёмки",
      },
    ],
  },
  {
    sectionId: "sec-5",
    title: "Раздел 5. Инженерные системы",
    planAmount: 4_200_000,
    payments: [],
  },
  {
    sectionId: "sec-6",
    title: "Раздел 6. Внутренняя отделка",
    planAmount: 2_900_000,
    payments: [
      {
        paymentId: "pay-6-1",
        sectionId: "sec-6",
        date: "2026-06-15",
        amount: 1_450_000,
        status: "conducted",
        purpose: "Аванс 50% по договору №35/06",
      },
      {
        paymentId: "pay-6-2",
        sectionId: "sec-6",
        date: "2026-07-20",
        amount: 1_000_000,
        status: "processing",
        purpose: "Промежуточный платёж за чистовую отделку",
      },
      {
        paymentId: "pay-6-3",
        sectionId: "sec-6",
        date: "2026-08-15",
        amount: 700_000,
        status: "expected",
        purpose: "Переплата — будет зачтена в счёт следующего этапа",
      },
    ],
  },
]

/** Вычисляет сумму проведённых и в обработке платежей для секции */
export function getSectionFactAmount(section: FinanceSection): number {
  return section.payments
    .filter((p) => p.status === "conducted" || p.status === "processing")
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

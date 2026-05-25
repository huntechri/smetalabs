/** Статус отдельного платежа */
export type PaymentStatus = "conducted" | "processing" | "cancelled" | "expected"

/** Автостатус раздела (план/факт) */
export type SectionStatus =
  | "paid"
  | "partial"
  | "unpaid"
  | "overpaid"

/** Отдельный платёж */
export interface FinancePayment {
  paymentId: string
  sectionId: string
  date: string
  amount: number
  status: PaymentStatus
  purpose: string
}

/** Раздел сметы с платежами */
export interface FinanceSection {
  sectionId: string
  title: string
  planAmount: number
  payments: FinancePayment[]
}

/** Статус отдельного платежа */
export type PaymentStatus =
  | "conducted"
  | "processing"
  | "cancelled"
  | "expected"

/** Автостатус раздела (план/факт) */
export type SectionStatus = "paid" | "partial" | "unpaid" | "overpaid"

/** Отдельный платёж */
export interface FinancePayment {
  paymentId: string
  sectionId: string | null
  date: string
  amount: number
  status: PaymentStatus
  purpose: string
  isPending?: boolean
  isUpdating?: boolean
  isDeleting?: boolean
}

/** Раздел сметы с платежами */
export interface FinanceSection {
  sectionId: string
  title: string
  planAmount: number
  payments: FinancePayment[]
  expenses?: number
  balance?: number
}

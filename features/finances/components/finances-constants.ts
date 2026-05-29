import { Badge } from "@/components/ui/badge"
import type { PaymentStatus, SectionStatus } from "@/features/finances/types"

/** Цвет бейджа для статуса платежа */
export const paymentStatusVariant: Record<
  PaymentStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  conducted: "default",
  processing: "secondary",
  cancelled: "destructive",
  expected: "outline",
}

/** Лейбл статуса платежа */
export const paymentStatusLabel: Record<PaymentStatus, string> = {
  conducted: "Проведён",
  processing: "В обработке",
  cancelled: "Отменён",
  expected: "Ожидается",
}

/** Цвет бейджа для статуса раздела */
export const sectionStatusVariant: Record<
  SectionStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  paid: "default",
  partial: "secondary",
  unpaid: "outline",
  overpaid: "destructive",
}

/** Лейбл статуса раздела */
export const sectionStatusLabel: Record<SectionStatus, string> = {
  paid: "Оплачен",
  partial: "Частично",
  unpaid: "Не оплачен",
  overpaid: "Переплата",
}

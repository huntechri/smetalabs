import { Fragment } from "react"
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/formatters"
import { StatusBadge } from "@/features/finances/components/finances-status-badge"
import { PaymentRow } from "@/features/finances/components/finances-payment-row"
import {
  getSectionFactAmount,
  getSectionStatus,
} from "@/features/finances/lib/utils"
import type { FinanceSection, FinancePayment } from "@/features/finances/types"
import {
  sectionStatusVariant,
  sectionStatusLabel,
} from "@/features/finances/components/finances-constants"

export interface SectionRowProps {
  section: FinanceSection
  isExpanded: boolean
  onToggle: () => void
  onEditPayment: (payment: FinancePayment) => void
  onDeletePayment: (paymentId: string) => void
}

export function SectionRow({
  section,
  isExpanded,
  onToggle,
  onEditPayment,
  onDeletePayment,
}: SectionRowProps) {
  const factAmount = getSectionFactAmount(section)
  const isGeneral = section.sectionId === "general_advance"
  const expenses = section.expenses ?? 0
  const balance = section.balance ?? 0
  const percent =
    section.planAmount > 0
      ? Math.round((factAmount / section.planAmount) * 100)
      : 0
  const status = isGeneral
    ? factAmount > 0
      ? "paid"
      : "unpaid"
    : getSectionStatus(section)

  const customLabelMap = isGeneral
    ? { paid: "Внесено", unpaid: "Не внесено" }
    : sectionStatusLabel

  return (
    <Fragment>
      {/* Строка раздела */}
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="size-6 p-0"
              aria-label={isExpanded ? "Свернуть" : "Развернуть"}
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
            >
              {isExpanded ? (
                <CaretDownIcon className="size-3.5" />
              ) : (
                <CaretRightIcon className="size-3.5" />
              )}
            </Button>
            <span className="font-medium">{section.title}</span>
            <StatusBadge
              status={status}
              variantMap={sectionStatusVariant}
              labelMap={customLabelMap}
            />
          </div>
        </TableCell>
        <TableCell className="tabular-nums">
          {isGeneral ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            formatMoney(section.planAmount)
          )}
        </TableCell>
        <TableCell className="tabular-nums">
          {formatMoney(factAmount)}
        </TableCell>
        {/* Затраты */}
        <TableCell className="tabular-nums">
          {expenses > 0 ? (
            formatMoney(expenses)
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>
        {/* Баланс */}
        <TableCell className="tabular-nums">
          {balance !== 0 ? (
            <span
              className={cn(
                "font-medium",
                balance > 0 ? "text-chart-2" : "text-destructive"
              )}
            >
              {balance > 0
                ? `+${formatMoney(balance)}`
                : `-${formatMoney(Math.abs(balance))}`}
            </span>
          ) : (
            formatMoney(0)
          )}
        </TableCell>
        <TableCell className="tabular-nums">
          {isGeneral ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            `${percent}%`
          )}
        </TableCell>
      </TableRow>

      {/* Вложенные строки платежей */}
      {isExpanded &&
        section.payments.map((payment) => (
          <PaymentRow
            key={payment.paymentId}
            payment={payment}
            onEdit={onEditPayment}
            onDelete={onDeletePayment}
          />
        ))}

      {/* Если нет платежей */}
      {isExpanded && section.payments.length === 0 && (
        <TableRow className="bg-muted/30">
          <TableCell
            colSpan={6}
            className="pl-12 text-xs text-muted-foreground"
          >
            Платежей пока нет
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  )
}

import {
  DotsThreeIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { formatMoney } from "@/lib/formatters"
import { formatDisplayDate } from "@/features/finances/lib/date-utils"
import { StatusBadge } from "@/features/finances/components/finances-status-badge"
import type { FinancePayment, PaymentStatus } from "@/features/finances/types"
import {
  paymentStatusVariant,
  paymentStatusLabel,
} from "@/features/finances/components/finances-constants"

export interface PaymentRowProps {
  payment: FinancePayment
  onEdit: (payment: FinancePayment) => void
  onDelete: (paymentId: string) => void
}

export function PaymentRow({ payment, onEdit, onDelete }: PaymentRowProps) {
  const isPending =
    payment.isPending || payment.isUpdating || payment.isDeleting

  return (
    <TableRow
      className={cn(
        "bg-muted/30 transition-opacity duration-200",
        isPending && "opacity-60"
      )}
    >
      {/* 1. Назначение платежа + Дата (с отступом) */}
      <TableCell className="pl-12">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          <span className="max-w-[280px] truncate font-medium text-foreground">
            {payment.purpose || "Без назначения"}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            ({formatDisplayDate(payment.date)})
          </span>
        </div>
      </TableCell>

      {/* 2. План -> Прочерк */}
      <TableCell className="text-xs text-muted-foreground">—</TableCell>

      {/* 3. Факт -> Сумма */}
      <TableCell className="font-medium text-chart-2 tabular-nums">
        {formatMoney(payment.amount)}
      </TableCell>

      {/* 4. Затраты -> Прочерк */}
      <TableCell className="text-xs text-muted-foreground">—</TableCell>

      {/* 5. Баланс -> Статус платежа */}
      <TableCell>
        <StatusBadge
          status={payment.status}
          variantMap={paymentStatusVariant}
          labelMap={paymentStatusLabel}
        />
      </TableCell>

      {/* 6. % -> Действия */}
      <TableCell className="text-right">
        {isPending ? (
          <div className="flex justify-end pr-1">
            <Spinner className="size-4 text-muted-foreground" />
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="size-6 p-0">
                <DotsThreeIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(payment)}>
                <PencilSimpleIcon className="mr-2 size-3.5" />
                Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(payment.paymentId)}
              >
                <TrashIcon className="mr-2 size-3.5" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  )
}

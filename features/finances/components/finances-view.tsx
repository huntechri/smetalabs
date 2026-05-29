"use client"

import { Fragment, useEffect, useState } from "react"
import {
  CaretDownIcon,
  CaretRightIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"
import { formatMoney } from "@/lib/formatters"
import { FinancesKpiCards } from "@/features/finances/components/finances-kpi-cards"
import { PaymentCreateDialog } from "@/features/finances/components/payment-create-dialog"
import { formatDisplayDate } from "@/features/finances/lib/date-utils"
import {
  getSectionFactAmount,
  getSectionStatus,
} from "@/features/finances/lib/utils"
import { useFinances } from "@/features/finances/hooks/use-finances"
import type {
  FinanceSection,
  FinancePayment,
  PaymentStatus,
  SectionStatus,
} from "@/features/finances/types"

/** Цвет бейджа для статуса платежа */
const paymentStatusVariant: Record<
  PaymentStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  conducted: "default",
  processing: "secondary",
  cancelled: "destructive",
  expected: "outline",
}

/** Лейбл статуса платежа */
const paymentStatusLabel: Record<PaymentStatus, string> = {
  conducted: "Проведён",
  processing: "В обработке",
  cancelled: "Отменён",
  expected: "Ожидается",
}

/** Цвет бейджа для статуса раздела */
const sectionStatusVariant: Record<
  SectionStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  paid: "default",
  partial: "secondary",
  unpaid: "outline",
  overpaid: "destructive",
}

/** Лейбл статуса раздела */
const sectionStatusLabel: Record<SectionStatus, string> = {
  paid: "Оплачен",
  partial: "Частично",
  unpaid: "Не оплачен",
  overpaid: "Переплата",
}

function StatusBadge({
  status,
  variantMap,
  labelMap,
}: {
  status: string
  variantMap: Record<string, React.ComponentProps<typeof Badge>["variant"]>
  labelMap: Record<string, string>
}) {
  return (
    <Badge variant={variantMap[status] ?? "outline"} className="text-xs">
      {labelMap[status] ?? status}
    </Badge>
  )
}

interface PaymentRowProps {
  payment: FinancePayment
  onEdit: (payment: FinancePayment) => void
  onDelete: (paymentId: string) => void
}

function PaymentRow({ payment, onEdit, onDelete }: PaymentRowProps) {
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

interface SectionRowProps {
  section: FinanceSection
  isExpanded: boolean
  onToggle: () => void
  onEditPayment: (payment: FinancePayment) => void
  onDeletePayment: (paymentId: string) => void
}

function SectionRow({
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

interface FinancesViewProps {
  estimateId: string
  projectId: string
}

export function FinancesView({ estimateId, projectId }: FinancesViewProps) {
  const {
    sections,
    loading,
    loadError,
    refetch,
    addPayment,
    updatePayment,
    deletePayment,
    record,
    totalPurchasesAmount,
  } = useFinances(projectId, estimateId)

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  )
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<FinancePayment | null>(
    null
  )

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  // Listen to toolbar action for adding a payment
  useEffect(() => {
    const handleAddPayment = () => {
      setEditingPayment(null)
      setPaymentDialogOpen(true)
    }
    window.addEventListener("project-finances:add-payment", handleAddPayment)
    return () => {
      window.removeEventListener(
        "project-finances:add-payment",
        handleAddPayment
      )
    }
  }, [])

  // Watch for Excel export custom event
  useEffect(() => {
    const handleExport = async () => {
      if (record && sections) {
        const { exportFinancesToExcel } =
          await import("@/features/finances/lib/finances-excel-exporter")
        await exportFinancesToExcel({
          record,
          sections,
          totalPurchasesAmount,
        })
      }
    }
    window.addEventListener("project-finances:export", handleExport)
    return () => {
      window.removeEventListener("project-finances:export", handleExport)
    }
  }, [record, sections])

  const openPaymentDialog = () => {
    setEditingPayment(null)
    setPaymentDialogOpen(true)
  }

  const handleEditPayment = (payment: FinancePayment) => {
    setEditingPayment(payment)
    setPaymentDialogOpen(true)
  }

  const handleSavePayment = (
    data: Omit<FinancePayment, "paymentId"> & { paymentId?: string }
  ) => {
    if (data.paymentId) {
      updatePayment(data.paymentId, data)
    } else {
      addPayment(data)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-0 flex-col gap-4 overflow-auto p-1">
        {/* KPI skeleton */}
        <div className="grid grid-cols-2 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-1.5 rounded-lg border border-border p-6"
            >
              <div className="flex items-center gap-1.5">
                <Skeleton className="size-3.5 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="mt-1 h-8 w-32" />
              <Skeleton className="mt-1.5 h-3.5 w-24" />
            </div>
          ))}
        </div>

        {/* Table skeleton */}
        <div className="overflow-hidden rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Раздел / Платёж</TableHead>
                <TableHead>План</TableHead>
                <TableHead>Факт</TableHead>
                <TableHead>Затраты</TableHead>
                <TableHead>Баланс</TableHead>
                <TableHead className="w-16">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  if (loadError || !record) {
    return (
      <div className="flex flex-col gap-3 p-1">
        <Alert variant="destructive">
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>
            {loadError ??
              "Не удалось загрузить данные сметы для раздела Финансы"}
          </AlertDescription>
        </Alert>
        <Button className="w-fit" variant="outline" onClick={() => refetch()}>
          Повторить
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-auto p-1">
      {/* KPI-шапка */}
      <FinancesKpiCards sections={sections} />

      {/* Таблица разделов + платежей */}
      <div className="overflow-hidden rounded-lg border">
        {sections.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-4 text-center text-xs text-muted-foreground">
            <p>В смете пока нет разделов.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Раздел / Платёж</TableHead>
                <TableHead>План</TableHead>
                <TableHead>Факт</TableHead>
                <TableHead>Затраты</TableHead>
                <TableHead>Баланс</TableHead>
                <TableHead className="w-16">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((section) => (
                <SectionRow
                  key={section.sectionId}
                  section={section}
                  isExpanded={expandedSections.has(section.sectionId)}
                  onToggle={() => toggleSection(section.sectionId)}
                  onEditPayment={handleEditPayment}
                  onDeletePayment={deletePayment}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <PaymentCreateDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        sections={sections}
        editingPayment={editingPayment}
        onSave={handleSavePayment}
      />
    </div>
  )
}

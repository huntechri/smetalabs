"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { CaretDownIcon, CaretRightIcon, PlusIcon } from "@phosphor-icons/react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMoney } from "@/lib/formatters"
import { FinancesKpiCards } from "@/features/finances/components/finances-kpi-cards"
import {
  financeSections,
  getSectionFactAmount,
  getSectionStatus,
} from "@/features/finances/__mocks__/finances"
import type {
  FinanceSection,
  FinancePayment,
  PaymentStatus,
  SectionStatus,
} from "@/features/finances/__mocks__/finances"

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
    <Badge variant={variantMap[status] ?? "outline"} className="text-[0.625rem]">
      {labelMap[status] ?? status}
    </Badge>
  )
}

function PaymentRow({ payment }: { payment: FinancePayment }) {
  return (
    <TableRow className="bg-muted/30">
      {/* Отступ + дата */}
      <TableCell className="pl-12">
        <span className="text-muted-foreground">
          {new Date(payment.date).toLocaleDateString("ru-RU")}
        </span>
      </TableCell>
      {/* Сумма */}
      <TableCell className="tabular-nums">{formatMoney(payment.amount)}</TableCell>
      {/* Статус */}
      <TableCell>
        <StatusBadge
          status={payment.status}
          variantMap={paymentStatusVariant}
          labelMap={paymentStatusLabel}
        />
      </TableCell>
      {/* Назначение */}
      <TableCell className="max-w-[320px] truncate text-muted-foreground">
        {payment.purpose}
      </TableCell>
    </TableRow>
  )
}

function SectionRow({
  section,
  isExpanded,
  onToggle,
}: {
  section: FinanceSection
  isExpanded: boolean
  onToggle: () => void
}) {
  const factAmount = getSectionFactAmount(section)
  const remainder = section.planAmount - factAmount
  const percent =
    section.planAmount > 0
      ? Math.round((factAmount / section.planAmount) * 100)
      : 0
  const status = getSectionStatus(section)

  return (
    <Fragment>
      {/* Строка раздела */}
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <TableCell className="flex items-center gap-2">
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
            labelMap={sectionStatusLabel}
          />
        </TableCell>
        <TableCell className="tabular-nums">{formatMoney(section.planAmount)}</TableCell>
        <TableCell className="tabular-nums">{formatMoney(factAmount)}</TableCell>
        <TableCell className="tabular-nums">{formatMoney(remainder)}</TableCell>
        <TableCell className="tabular-nums">{percent}%</TableCell>
      </TableRow>

      {/* Вложенные строки платежей */}
      {isExpanded &&
        section.payments.map((payment) => (
          <PaymentRow key={payment.paymentId} payment={payment} />
        ))}

      {/* Если нет платежей */}
      {isExpanded && section.payments.length === 0 && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={5} className="pl-12 text-muted-foreground">
            Платежей пока нет
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  )
}

export function FinancesView({
  estimateId,
  projectId,
}: {
  estimateId: string
  projectId: string
}) {
  // eslint-disable-next-line no-console
  console.log("FinancesView mounted", { projectId, estimateId })

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  )

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }, [])

  // Listen to toolbar «Платёж» event
  useEffect(() => {
    const handleAddPayment = () => {
      // Заглушка — в будущем откроется диалог добавления платежа
      // eslint-disable-next-line no-alert
      alert(`Добавление платежа (прототип)\nСмета: ${estimateId}\nПроект: ${projectId}`)
    }
    window.addEventListener(
      "project-finances:add-payment",
      handleAddPayment
    )
    return () => {
      window.removeEventListener(
        "project-finances:add-payment",
        handleAddPayment
      )
    }
  }, [estimateId, projectId])

  // Listen to toolbar «Экспорт» event
  useEffect(() => {
    const handleExport = () => {
      // eslint-disable-next-line no-alert
      alert(`Экспорт финансов (прототип)\nСмета: ${estimateId}`)
    }
    window.addEventListener("project-finances:export", handleExport)
    return () => {
      window.removeEventListener("project-finances:export", handleExport)
    }
  }, [estimateId])

  return (
    <div className="flex flex-col gap-4 p-1">
      {/* KPI-шапка */}
      <FinancesKpiCards sections={financeSections} />

      {/* Таблица разделов + платежей */}
      <div className="rounded-lg border border-dashed border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Раздел / Платёж</TableHead>
              <TableHead>План</TableHead>
              <TableHead>Факт</TableHead>
              <TableHead>Остаток</TableHead>
              <TableHead className="w-20">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {financeSections.map((section) => (
              <SectionRow
                key={section.sectionId}
                section={section}
                isExpanded={expandedSections.has(section.sectionId)}
                onToggle={() => toggleSection(section.sectionId)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Кнопка быстрого добавления платежа (дублирует тулбар) */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-dashed"
          onClick={() =>
            // eslint-disable-next-line no-alert
            alert(`Добавление платежа (прототип)`)
          }
        >
          <PlusIcon className="size-3.5" />
          Платёж
        </Button>
      </div>
    </div>
  )
}

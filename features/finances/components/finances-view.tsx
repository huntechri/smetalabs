"use client"

import { useEffect, useState } from "react"
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
import { FinancesKpiCards } from "@/features/finances/components/finances-kpi-cards"
import { PaymentCreateDialog } from "@/features/finances/components/payment-create-dialog"
import { SectionRow } from "@/features/finances/components/finances-section-row"
import { useFinances } from "@/features/finances/hooks/use-finances"
import type { FinancePayment } from "@/features/finances/types"

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
  }, [record, sections, totalPurchasesAmount])

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

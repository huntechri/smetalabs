"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { fetchProjectEstimateWorkCoefficient } from "@/features/estimates/api/project-estimate-content-client"

interface EstimateWorkCoefficientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  recordId: string
  saving: boolean
  applyWorkCoefficient: (coefficient: number) => Promise<unknown>
}

function formatCoefficientInput(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : String(value).replace(".", ",")
}

export function EstimateWorkCoefficientDialog({
  open,
  onOpenChange,
  projectId,
  recordId,
  saving,
  applyWorkCoefficient,
}: EstimateWorkCoefficientDialogProps) {
  const [coefficientValue, setCoefficientValue] = React.useState("0")
  const [coefficientError, setCoefficientError] = React.useState<string | null>(
    null
  )

  const coefficientQuery = useQuery({
    queryKey: ["project-estimate-work-coefficient", projectId, recordId],
    queryFn: () => fetchProjectEstimateWorkCoefficient({ projectId, recordId }),
    enabled: open,
    staleTime: 0,
  })

  const nextValue = coefficientQuery.data?.data.coefficientPercent
  const [prevOpen, setPrevOpen] = React.useState(open)
  const [prevNextValue, setPrevNextValue] = React.useState(nextValue)

  if (open !== prevOpen || nextValue !== prevNextValue) {
    setPrevOpen(open)
    setPrevNextValue(nextValue)
    if (open && nextValue !== undefined) {
      setCoefficientValue(formatCoefficientInput(nextValue))
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = Number(coefficientValue.trim().replace(",", "."))

    if (!Number.isFinite(parsed) || parsed < 0) {
      setCoefficientError("Введите коэффициент 0 или больше")
      return
    }

    setCoefficientError(null)

    try {
      await applyWorkCoefficient(parsed)
      await coefficientQuery.refetch()
      onOpenChange(false)
    } catch (err) {
      setCoefficientError(
          err instanceof Error
              ? err.message
              : "Не удалось применить коэффициент"
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Коэффициент работ</DialogTitle>
            <DialogDescription>
              Коэффициент применяется только к работам. Цена округляется
              вверх до ближайших 10 ₽.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="coefficient">Коэффициент (%)</FieldLabel>
            <Input
              id="coefficient"
              autoFocus
              disabled={coefficientQuery.isLoading}
              inputMode="decimal"
              onChange={(event) => setCoefficientValue(event.target.value)}
              placeholder="10"
              value={coefficientValue}
            />
          </Field>
          {coefficientError ? (
            <p className="text-xs text-destructive">{coefficientError}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={saving || coefficientQuery.isLoading}
            >
              Применить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

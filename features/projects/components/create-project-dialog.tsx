"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ProjectMutationInput, ProjectRow, ProjectStatus } from "@/types/project"

const STATUS_OPTIONS: { label: string; value: ProjectStatus }[] = [
  { label: "Новый", value: "new" },
  { label: "В работе", value: "in_progress" },
  { label: "Завершён", value: "completed" },
]

type FormState = {
  title: string
  customerName: string
  address: string
  budgetAmount: string
  startDate: string
  endDate: string
  status: ProjectStatus
  progress: string
}

const EMPTY_FORM: FormState = {
  title: "",
  customerName: "",
  address: "",
  budgetAmount: "",
  startDate: "",
  endDate: "",
  status: "new",
  progress: "0",
}

function getInitialForm(project?: ProjectRow | null): FormState {
  if (!project) return EMPTY_FORM

  return {
    title: project.title,
    customerName: project.customerName ?? "",
    address: project.address ?? "",
    budgetAmount: project.budgetAmount === null ? "" : String(project.budgetAmount),
    startDate: project.startDate ?? "",
    endDate: project.endDate ?? "",
    status: project.status,
    progress: String(project.progress),
  }
}

function toMutationInput(form: FormState): ProjectMutationInput {
  const budget = form.budgetAmount.trim()
  const progress = form.progress.trim()

  return {
    title: form.title,
    customerName: form.customerName,
    address: form.address,
    budgetAmount: budget ? Number(budget.replace(",", ".")) : null,
    startDate: form.startDate,
    endDate: form.endDate,
    status: form.status,
    progress: progress ? Number(progress) : 0,
  }
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  project,
  saving,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: ProjectRow | null
  saving?: boolean
  onSubmit: (input: ProjectMutationInput) => Promise<void>
}) {
  const [form, setForm] = useState<FormState>(getInitialForm(project))
  const [error, setError] = useState<string | null>(null)
  const isEdit = Boolean(project)

  useEffect(() => {
    if (open) {
      setForm(getInitialForm(project))
      setError(null)
    }
  }, [open, project])

  const updateField = <TKey extends keyof FormState>(key: TKey, value: FormState[TKey]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError("Укажите название проекта")
      return
    }

    const progress = Number(form.progress)
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      setError("Прогресс должен быть от 0 до 100")
      return
    }

    const budget = form.budgetAmount.trim()
    if (budget && (!Number.isFinite(Number(budget.replace(",", "."))) || Number(budget.replace(",", ".")) < 0)) {
      setError("Бюджет не может быть отрицательным")
      return
    }

    try {
      setError(null)
      await onSubmit(toMutationInput(form))
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить проект")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Редактировать проект" : "Новый проект"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Измените данные проекта и сохраните результат."
              : "Заполните данные для создания нового проекта."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="project-title">Название проекта</Label>
            <Input
              id="project-title"
              disabled={saving}
              placeholder="Введите название проекта"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-customer">Заказчик</Label>
            <Input
              id="project-customer"
              disabled={saving}
              placeholder="Название заказчика"
              value={form.customerName}
              onChange={(e) => updateField("customerName", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-budget">Бюджет</Label>
            <Input
              id="project-budget"
              disabled={saving}
              inputMode="decimal"
              placeholder="0"
              value={form.budgetAmount}
              onChange={(e) => updateField("budgetAmount", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="project-address">Адрес объекта</Label>
            <Input
              id="project-address"
              disabled={saving}
              placeholder="Адрес объекта"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-start-date">Дата начала</Label>
            <Input
              id="project-start-date"
              disabled={saving}
              placeholder="01.06.2026"
              value={form.startDate}
              onChange={(e) => updateField("startDate", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-end-date">Дата окончания</Label>
            <Input
              id="project-end-date"
              disabled={saving}
              placeholder="15.12.2026"
              value={form.endDate}
              onChange={(e) => updateField("endDate", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Статус</Label>
            <Select
              disabled={saving}
              value={form.status}
              onValueChange={(value) => updateField("status", value as ProjectStatus)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-progress">Прогресс, %</Label>
            <Input
              id="project-progress"
              disabled={saving}
              inputMode="numeric"
              placeholder="0"
              value={form.progress}
              onChange={(e) => updateField("progress", e.target.value)}
            />
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter showCloseButton={false}>
          <Button disabled={saving} variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button disabled={saving} onClick={handleSubmit}>
            {saving ? "Сохранение..." : isEdit ? "Сохранить" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

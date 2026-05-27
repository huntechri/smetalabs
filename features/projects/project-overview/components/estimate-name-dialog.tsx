"use client"

import type { FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { EstimateDialogState } from "@/features/projects/project-overview/types"
import type { ProjectEstimateRecordStatus } from "@/types/project-estimate-record"

export function EstimateNameDialog({
  state,
  saving,
  onOpenChange,
  onNameChange,
  onTypeChange,
  onStatusChange,
  onSubmit,
}: {
  state: EstimateDialogState
  saving?: boolean
  onOpenChange: (open: boolean) => void
  onNameChange: (name: string) => void
  onTypeChange: (type: string) => void
  onStatusChange: (status: ProjectEstimateRecordStatus) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  const isEdit = Boolean(state.estimate)

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Редактировать смету" : "Новая смета"}
          </DialogTitle>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="estimate-name">Название сметы</FieldLabel>
              <Input
                id="estimate-name"
                autoFocus
                disabled={saving}
                maxLength={200}
                value={state.name}
                onChange={(event) => onNameChange(event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="estimate-type">Тип сметы</FieldLabel>
              <Select
                value={state.type}
                onValueChange={onTypeChange}
                disabled={saving}
              >
                <SelectTrigger id="estimate-type">
                  <SelectValue placeholder="Выберите тип сметы" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Основная" className="rounded-lg">
                    Основная
                  </SelectItem>
                  <SelectItem value="Дополнительная" className="rounded-lg">
                    Дополнительная
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="estimate-status">Статус</FieldLabel>
              <Select
                value={state.status}
                onValueChange={(val) =>
                  onStatusChange(val as ProjectEstimateRecordStatus)
                }
                disabled={saving}
              >
                <SelectTrigger id="estimate-status">
                  <SelectValue placeholder="Выберите статус сметы" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="new" className="rounded-lg">
                    Новая
                  </SelectItem>
                  <SelectItem value="in_progress" className="rounded-lg">
                    В работе
                  </SelectItem>
                  <SelectItem value="completed" className="rounded-lg">
                    Завершена
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <FieldError>{state.error}</FieldError>

          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={saving}>
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

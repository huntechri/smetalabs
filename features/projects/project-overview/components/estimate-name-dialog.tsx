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
import type { EstimateDialogState } from "@/features/projects/project-overview/types"

export function EstimateNameDialog({
  state,
  saving,
  onOpenChange,
  onNameChange,
  onSubmit,
}: {
  state: EstimateDialogState
  saving?: boolean
  onOpenChange: (open: boolean) => void
  onNameChange: (name: string) => void
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

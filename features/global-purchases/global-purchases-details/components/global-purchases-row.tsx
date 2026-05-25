"use client"

import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { EditableBadge } from "@/components/ui/editable-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type {
  GlobalPurchaseMutationInput,
  GlobalPurchaseRow,
} from "@/types/global-purchases"
import type { ProjectRow } from "@/types/project"
import {
  CalendarDots,
  CaretDown,
  GearSixIcon,
  SwapIcon,
  TrashIcon,
} from "@phosphor-icons/react"

function formatMoney(value: number | null) {
  if (value === null) return "—"
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })
}

function formatNumber(value: number | null) {
  if (value === null) return "—"
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 3 })
}

function formatEditableNumber(value: string | number) {
  const text = String(value).trim()
  if (!text) return "—"
  const parsed = Number(text.replace(",", "."))
  if (!Number.isFinite(parsed)) return text
  return parsed.toLocaleString("ru-RU", { maximumFractionDigits: 3 })
}

function formatEditableMoney(value: string | number) {
  const text = String(value).trim()
  if (!text) return "—"
  const parsed = Number(text.replace(",", "."))
  if (!Number.isFinite(parsed)) return text
  return parsed.toLocaleString("ru-RU", { maximumFractionDigits: 2 })
}

function formatDate(value: string | null) {
  if (!value) return "Дата"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("ru-RU")
}

function toDateValue(value: string | null) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toIsoDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseNullableNumber(value: string) {
  const trimmed = value.trim().replace(",", ".")
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function buildInput(
  row: GlobalPurchaseRow,
  updates: Partial<GlobalPurchaseMutationInput>
): GlobalPurchaseMutationInput {
  return {
    title: row.title,
    unit: row.unit,
    planQuantity: row.planQuantity,
    planPrice: row.planPrice,
    factQuantity: row.factQuantity,
    factPrice: row.factPrice,
    supplierId: row.supplierId,
    projectId: row.projectId,
    purchaseDate: row.purchaseDate,
    status: row.status,
    notes: row.notes,
    directoryMaterialId: row.directoryMaterialId,
    ...updates,
  }
}

const FACT_SAVE_DELAY_MS = 450

export function GlobalPurchasesRow({
  onDelete,
  onReplace,
  onUpdate,
  projects,
  row,
  saving,
}: {
  onDelete: (row: GlobalPurchaseRow) => void
  onReplace: (row: GlobalPurchaseRow) => void
  onUpdate: (
    row: GlobalPurchaseRow,
    input: GlobalPurchaseMutationInput
  ) => Promise<void>
  projects: ProjectRow[]
  row: GlobalPurchaseRow
  saving: boolean
}) {
  const [visibleFactQuantity, setVisibleFactQuantity] = useState<number | null>(
    row.factQuantity
  )
  const [visibleFactPrice, setVisibleFactPrice] = useState<number | null>(
    row.factPrice
  )
  const rowRef = useRef(row)
  const factQuantityRef = useRef(row.factQuantity)
  const factPriceRef = useRef(row.factPrice)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveVersionRef = useRef(0)

  useEffect(() => {
    rowRef.current = row
    factQuantityRef.current = row.factQuantity
    factPriceRef.current = row.factPrice
    setVisibleFactQuantity(row.factQuantity)
    setVisibleFactPrice(row.factPrice)
  }, [row])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const scheduleFactSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const saveVersion = saveVersionRef.current + 1
    saveVersionRef.current = saveVersion

    saveTimerRef.current = setTimeout(async () => {
      const currentRow = rowRef.current
      try {
        await onUpdate(
          currentRow,
          buildInput(currentRow, {
            factQuantity: factQuantityRef.current,
            factPrice: factPriceRef.current,
          })
        )
      } catch (err) {
        if (saveVersionRef.current === saveVersion) {
          factQuantityRef.current = currentRow.factQuantity
          factPriceRef.current = currentRow.factPrice
          setVisibleFactQuantity(currentRow.factQuantity)
          setVisibleFactPrice(currentRow.factPrice)
        }
        throw err
      }
    }, FACT_SAVE_DELAY_MS)
  }

  const updateFactQuantity = (value: string) => {
    const nextValue = parseNullableNumber(value)
    factQuantityRef.current = nextValue
    setVisibleFactQuantity(nextValue)
    rowRef.current = { ...rowRef.current, factQuantity: nextValue }
    scheduleFactSave()
  }

  const updateFactPrice = (value: string) => {
    const nextValue = parseNullableNumber(value)
    factPriceRef.current = nextValue
    setVisibleFactPrice(nextValue)
    rowRef.current = { ...rowRef.current, factPrice: nextValue }
    scheduleFactSave()
  }

  const updateProject = async (projectId: string | null) => {
    const project = projects.find((item) => item.id === projectId)
    rowRef.current = {
      ...rowRef.current,
      projectId,
      projectTitle: project?.title ?? null,
    }
    await onUpdate(rowRef.current, buildInput(rowRef.current, { projectId }))
  }

  const updateDate = async (date: Date | undefined) => {
    const purchaseDate = date ? toIsoDate(date) : null
    rowRef.current = { ...rowRef.current, purchaseDate }
    await onUpdate(rowRef.current, buildInput(rowRef.current, { purchaseDate }))
  }

  return (
    <div className="mx-3 my-1.5 grid gap-2 rounded-md border border-border p-2 transition-colors hover:bg-muted/50 xl:grid-cols-[minmax(460px,2fr)_76px_minmax(150px,0.55fr)_minmax(230px,0.85fr)_minmax(240px,0.85fr)]">
      <div className="min-w-0 rounded-md border border-border p-2">
        <span className="mb-1 block text-xs text-muted-foreground uppercase">
          Наименование
        </span>
        <div className="text-sm leading-snug font-medium break-words">
          {row.title}
        </div>
      </div>

      <div className="min-w-0 rounded-md border border-border p-2">
        <span className="mb-1 block text-xs text-muted-foreground uppercase">
          Ед. изм
        </span>
        <div className="text-sm font-medium">{row.unit}</div>
      </div>

      <div className="min-w-0 rounded-md border border-border p-2">
        <span className="mb-1 block text-xs text-muted-foreground uppercase">
          Кол-во План/Факт
        </span>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className="gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums"
          >
            <span className="text-muted-foreground">План:</span>
            <span>{formatNumber(row.planQuantity)}</span>
          </Badge>
          <EditableBadge
            className="max-w-full"
            formatDisplay={formatEditableNumber}
            label="Факт"
            onChange={updateFactQuantity}
            value={visibleFactQuantity ?? ""}
          />
        </div>
      </div>

      <div className="min-w-0 rounded-md border border-border p-2">
        <span className="mb-1 block text-xs text-muted-foreground uppercase">
          Цена План/Факт
        </span>
        <div className="flex min-w-0 flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className="gap-1 rounded-md px-1.5 py-0.5 font-normal tabular-nums"
          >
            <span className="text-muted-foreground">План:</span>
            <span>{formatMoney(row.planPrice)} ₽</span>
          </Badge>
          <EditableBadge
            className="max-w-full"
            formatDisplay={formatEditableMoney}
            label="Факт"
            onChange={updateFactPrice}
            suffix="₽"
            value={visibleFactPrice ?? ""}
          />
        </div>
      </div>

      <div className="min-w-0 rounded-md border border-border p-2">
        <span className="mb-1 block text-xs text-muted-foreground uppercase">
          Объект, дата, действие
        </span>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge
                variant="outline"
                className="max-w-28 cursor-pointer gap-1 rounded-md px-1.5 py-0.5 font-normal hover:bg-muted"
              >
                <span className="truncate">{row.projectTitle ?? "Объект"}</span>
                <CaretDown className="size-2.5" />
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-72 w-72 overflow-y-auto"
            >
              <DropdownMenuItem onClick={() => updateProject(null)}>
                Без объекта
              </DropdownMenuItem>
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => updateProject(project.id)}
                >
                  {project.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Badge
                variant="outline"
                className="cursor-pointer gap-1 rounded-md px-1.5 py-0.5 font-normal hover:bg-muted"
              >
                <CalendarDots className="size-3" />
                {formatDate(row.purchaseDate)}
              </Badge>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={toDateValue(row.purchaseDate)}
                onSelect={updateDate}
              />
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label={`Действия для ${row.title}`}
                className="ml-auto"
                disabled={saving}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <GearSixIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onReplace(row)}>
                <SwapIcon />
                Заменить
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(row)}
                variant="destructive"
              >
                <TrashIcon />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

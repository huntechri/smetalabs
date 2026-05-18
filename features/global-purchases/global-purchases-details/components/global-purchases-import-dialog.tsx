"use client"

import { type ChangeEvent, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { GlobalPurchaseMutationInput } from "@/types/global-purchases"
import type { ProjectRow } from "@/types/project"

type ImportPreviewRow = {
  index: number
  input: GlobalPurchaseMutationInput | null
  status: "valid" | "error"
  errors: string[]
  source: Record<string, string>
}

const REQUIRED_COLUMNS = "Наименование;Ед. изм.;Кол-во факт;Цена факт;Объект;Дата;Примечание"

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ")
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? ""
}

function parseNumber(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".")
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function parseDate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!match) return null

  const day = match[1]!.padStart(2, "0")
  const month = match[2]!.padStart(2, "0")
  const year = match[3]!
  return `${year}-${month}-${day}`
}

function splitDelimitedLine(line: string, delimiter: string) {
  const cells: string[] = []
  let current = ""
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === delimiter && !quoted) {
      cells.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

function parseDelimited(text: string) {
  const lines = text
    .replace(/^\ufeff/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const delimiter = (lines[0]!.match(/;/g)?.length ?? 0) >= (lines[0]!.match(/,/g)?.length ?? 0) ? ";" : ","
  const headers = splitDelimitedLine(lines[0]!, delimiter).map(normalizeKey)

  return lines.slice(1).map((line) => {
    const cells = splitDelimitedLine(line, delimiter)
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? ""
    })
    return row
  })
}

function pick(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeKey(key)]
    if (value !== undefined) return value
  }
  return ""
}

function buildPreviewRows(text: string, projects: ProjectRow[]): ImportPreviewRow[] {
  const projectsByTitle = new Map(projects.map((project) => [normalizeKey(project.title), project]))

  return parseDelimited(text).map((row, index) => {
    const errors: string[] = []
    const title = normalizeText(pick(row, ["Наименование", "Название", "Материал", "title"]))
    const unit = normalizeText(pick(row, ["Ед. изм.", "Ед изм", "Единица", "unit"]))
    const factQuantity = parseNumber(pick(row, ["Кол-во факт", "Количество факт", "Количество", "factQuantity"]))
    const factPrice = parseNumber(pick(row, ["Цена факт", "Цена", "factPrice"]))
    const planQuantity = parseNumber(pick(row, ["Кол-во план", "Количество план", "planQuantity"])) ?? 0
    const planPrice = parseNumber(pick(row, ["Цена план", "planPrice"])) ?? factPrice ?? 0
    const projectTitle = normalizeText(pick(row, ["Объект", "Проект", "project"]))
    const project = projectTitle ? projectsByTitle.get(normalizeKey(projectTitle)) : null
    const purchaseDate = parseDate(pick(row, ["Дата", "Дата закупки", "purchaseDate"]))
    const notes = normalizeText(pick(row, ["Примечание", "Комментарий", "notes"]))

    if (!title) errors.push("Нет наименования")
    if (!unit) errors.push("Нет единицы измерения")
    if (factQuantity === null) errors.push("Некорректное фактическое количество")
    if (factPrice === null) errors.push("Некорректная фактическая цена")
    if (projectTitle && !project) errors.push(`Объект не найден: ${projectTitle}`)

    return {
      index: index + 2,
      input:
        errors.length === 0
          ? {
              title,
              unit,
              planQuantity,
              planPrice,
              factQuantity,
              factPrice,
              supplierId: null,
              projectId: project?.id ?? null,
              purchaseDate,
              status: "planned",
              notes: notes || null,
            }
          : null,
      status: errors.length === 0 ? "valid" : "error",
      errors,
      source: row,
    }
  })
}

export function GlobalPurchasesImportDialog({
  onImport,
  onOpenChange,
  open,
  projects,
  saving,
}: {
  onImport: (input: GlobalPurchaseMutationInput) => Promise<void>
  onOpenChange: (open: boolean) => void
  open: boolean
  projects: ProjectRow[]
  saving: boolean
}) {
  const [fileName, setFileName] = useState("")
  const [fileText, setFileText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const previewRows = useMemo(
    () => (fileText ? buildPreviewRows(fileText, projects) : []),
    [fileText, projects]
  )
  const validRows = previewRows.filter((row) => row.status === "valid" && row.input)
  const errorRows = previewRows.filter((row) => row.status === "error")

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setResult(null)
    setError(null)

    if (!file) {
      setFileName("")
      setFileText("")
      return
    }

    setFileName(file.name)
    setFileText(await file.text())
  }

  const handleApply = async () => {
    if (validRows.length === 0) {
      setError("Нет корректных строк для импорта")
      return
    }

    setImporting(true)
    setError(null)
    setResult(null)

    let applied = 0
    try {
      for (const row of validRows) {
        if (!row.input) continue
        await onImport(row.input)
        applied += 1
      }
      setResult(`Импортировано строк: ${applied}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось импортировать закупки")
    } finally {
      setImporting(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (nextOpen) return
    setFileName("")
    setFileText("")
    setError(null)
    setResult(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[min(720px,calc(100vh-4rem))] max-h-[calc(100vh-4rem)] flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Импорт закупок</DialogTitle>
          <DialogDescription>
            Загрузите CSV с колонками: {REQUIRED_COLUMNS}. Строки с ошибками не будут импортированы.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-2">
          <Input accept=".csv,text/csv" type="file" onChange={handleFileChange} />
          <div className="text-xs text-muted-foreground">
            {fileName ? `Файл: ${fileName}` : "Файл ещё не выбран"}
          </div>
          <FieldError>{error}</FieldError>
          {result ? <div className="rounded-md border border-border bg-muted p-2 text-xs">{result}</div> : null}
        </div>

        <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-md border border-border">
          {previewRows.length === 0 ? (
            <Empty className="h-full min-h-80 border-0">
              <EmptyHeader>
                <EmptyTitle>Нет строк для предпросмотра</EmptyTitle>
                <EmptyDescription>Выберите CSV-файл с закупками.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {previewRows.map((row) => {
            const sourceTitle = pick(row.source, ["Наименование", "Название", "Материал", "title"])
            return (
              <Card key={row.index} className="m-2 rounded-md bg-transparent p-0 shadow-none">
                <CardContent className="grid gap-2 p-3 sm:grid-cols-[80px_minmax(0,1fr)_160px] sm:items-center">
                  <div className="text-xs text-muted-foreground">Строка {row.index}</div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {(row.input?.title ?? sourceTitle) || "—"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {row.input ? `${row.input.factQuantity ?? ""} ${row.input.unit} × ${row.input.factPrice ?? ""}` : row.errors.join("; ")}
                    </div>
                  </div>
                  <div className={row.status === "valid" ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>
                    {row.status === "valid" ? "Готово к импорту" : row.errors.join("; ")}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <DialogFooter className="shrink-0">
          <div className="mr-auto text-xs text-muted-foreground">
            Корректных: {validRows.length}. С ошибками: {errorRows.length}.
          </div>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={importing}>
            Закрыть
          </Button>
          <Button type="button" onClick={handleApply} disabled={saving || importing || validRows.length === 0}>
            Импортировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { type ChangeEvent, useEffect, useState } from "react"
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
import type {
  DirectoryWorkImportCreateInput,
  DirectoryWorkImportPreviewResponse,
  DirectoryWorkImportRowStatus,
} from "@/features/directory-works/types"

const HEADER_ALIASES: Record<string, string> = {
  code: "code",
  код: "code",
  title: "title",
  название: "title",
  наименование: "title",
  unit: "unit",
  "ед. изм.": "unit",
  "ед изм": "unit",
  единица: "unit",
  rate: "rate",
  price: "rate",
  расценка: "rate",
  цена: "rate",
  category: "category",
  категория: "category",
  subcategory: "subcategory",
  подкатегория: "subcategory",
  aliases: "aliases",
  синонимы: "aliases",
  keywords: "keywords",
  "ключевые слова": "keywords",
  description: "description",
  описание: "description",
  included_operations: "included_operations",
  "включенные операции": "included_operations",
  excluded_operations: "excluded_operations",
  "исключенные операции": "excluded_operations",
  price_kind: "price_kind",
  "тип цены": "price_kind",
  currency_code: "currency_code",
  currency: "currency_code",
  валюта: "currency_code",
  vat_rate: "vat_rate",
  ндс: "vat_rate",
  source_name: "source_name",
  источник: "source_name",
  source_external_row_key: "source_external_row_key",
  external_id: "source_external_row_key",
  effective_date: "effective_date",
}

const STATUS_LABELS: Record<DirectoryWorkImportRowStatus, string> = {
  pending: "Ожидает",
  valid: "Готово",
  warning: "Предупреждение",
  error: "Ошибка",
  duplicate: "Дубль",
  conflict: "Конфликт",
  applied: "Применено",
  skipped: "Пропущено",
}

function normalizeHeader(header: string) {
  const key = header.trim().toLowerCase().replace(/\s+/g, " ").replace(/-/g, "_")
  return HEADER_ALIASES[key] ?? key.replace(/\s+/g, "_")
}

function detectDelimiter(firstLine: string) {
  return (firstLine.match(/;/g) ?? []).length > (firstLine.match(/,/g) ?? []).length
    ? ";"
    : ","
}

function parseCsvRows(content: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = []
  let value = ""
  let quoted = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    const next = content[index + 1]

    if (char === '"') {
      if (quoted && next === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }

    if (!quoted && char === delimiter) {
      row.push(value.trim())
      value = ""
      continue
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1
      row.push(value.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      value = ""
      continue
    }

    value += char
  }

  row.push(value.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

function parseCsv(content: string, fallbackSourceName: string) {
  const trimmed = content.replace(/^\uFEFF/, "").trim()
  if (!trimmed) return { rows: [], sourceName: fallbackSourceName || null }

  const delimiter = detectDelimiter(trimmed.split(/\r?\n/, 1)[0] ?? "")
  const [headers = [], ...dataRows] = parseCsvRows(trimmed, delimiter)
  const normalizedHeaders = headers.map(normalizeHeader)

  const rows = dataRows
    .map((dataRow) => {
      const record: Record<string, unknown> = {}
      normalizedHeaders.forEach((header, index) => {
        const value = dataRow[index]?.trim()
        if (header && value) record[header] = value
      })
      return record
    })
    .filter((row) => Object.keys(row).length > 0)

  return { rows, sourceName: fallbackSourceName || null }
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось выполнить импорт"
}

export function DirectoryWorkImportDialog({
  open,
  onOpenChange,
  importing,
  onCreateJob,
  onApplyJob,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  importing: boolean
  onCreateJob: (
    input: DirectoryWorkImportCreateInput
  ) => Promise<DirectoryWorkImportPreviewResponse["data"]>
  onApplyJob: (id: string) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [sourceName, setSourceName] = useState("")
  const [preview, setPreview] =
    useState<DirectoryWorkImportPreviewResponse["data"] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setFile(null)
      setSourceName("")
      setPreview(null)
      setError(null)
    }
  }, [open])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null)
    setPreview(null)
    setError(null)
  }

  const handleCreatePreview = async () => {
    if (!file) {
      setError("Выберите CSV-файл для импорта")
      return
    }

    try {
      setError(null)
      const parsed = parseCsv(await file.text(), sourceName.trim())
      if (parsed.rows.length === 0) {
        setError("Файл не содержит строк для импорта")
        return
      }

      setPreview(
        await onCreateJob({
          rows: parsed.rows,
          fileName: file.name,
          fileMimeType: file.type || "text/csv",
          fileSizeBytes: file.size,
          sourceName: parsed.sourceName,
        })
      )
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleApply = async () => {
    if (!preview) return

    try {
      setError(null)
      await onApplyJob(preview.job.id)
      onOpenChange(false)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const rows = preview?.rows ?? []
  const hasApplyableRows =
    preview !== null && preview.job.validRows + preview.job.warningRows > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Импорт работ</DialogTitle>
          <DialogDescription>
            Загрузите CSV с колонками title, unit, rate, category и
            дополнительными полями. Данные сначала попадут в staging preview,
            а в справочник будут записаны только после подтверждения.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_240px]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="directory-work-import-file">CSV-файл</Label>
              <Input
                accept=".csv,text/csv"
                id="directory-work-import-file"
                onChange={handleFileChange}
                type="file"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="directory-work-import-source">Источник</Label>
              <Input
                id="directory-work-import-source"
                maxLength={120}
                onChange={(event) => setSourceName(event.target.value)}
                placeholder="Например: internal-catalog"
                value={sourceName}
              />
            </div>
          </div>

          {file ? (
            <p className="text-sm text-muted-foreground">
              Выбран файл: {file.name}, {formatBytes(file.size)}
            </p>
          ) : null}

          {preview ? (
            <div className="grid gap-3 rounded-md border border-dashed border-fuchsia-500 p-3">
              <div className="grid gap-2 text-sm sm:grid-cols-5">
                <span>Всего: {preview.job.totalRows}</span>
                <span>Готово: {preview.job.validRows}</span>
                <span>Предупреждения: {preview.job.warningRows}</span>
                <span>Ошибки: {preview.job.errorRows}</span>
                <span>Дубли: {preview.job.duplicateRows}</span>
              </div>

              <div className="max-h-80 overflow-auto rounded-md border">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Статус</th>
                      <th className="px-3 py-2 font-medium">Название</th>
                      <th className="px-3 py-2 font-medium">Ед.</th>
                      <th className="px-3 py-2 font-medium">Расценка</th>
                      <th className="px-3 py-2 font-medium">Сообщения</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((row) => {
                      const normalized = row.normalizedData as Record<string, unknown>
                      const messages = [...row.errorMessages, ...row.warningMessages]
                      return (
                        <tr key={row.id} className="border-t">
                          <td className="px-3 py-2">{row.rowNumber}</td>
                          <td className="px-3 py-2">{STATUS_LABELS[row.status]}</td>
                          <td className="px-3 py-2">{String(normalized.title ?? "—")}</td>
                          <td className="px-3 py-2">{String(normalized.unit ?? "—")}</td>
                          <td className="px-3 py-2">{String(normalized.rate ?? "—")}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {messages.length > 0 ? messages.join("; ") : "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > 50 ? (
                <p className="text-sm text-muted-foreground">
                  В preview показаны первые 50 строк из {rows.length}.
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter showCloseButton={false}>
          <Button
            disabled={importing}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Отмена
          </Button>
          <Button
            disabled={importing || !file}
            onClick={handleCreatePreview}
            type="button"
            variant="outline"
          >
            {importing ? "Обработка..." : "Создать preview"}
          </Button>
          <Button
            disabled={importing || !hasApplyableRows}
            onClick={handleApply}
            type="button"
          >
            {importing ? "Применение..." : "Применить импорт"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

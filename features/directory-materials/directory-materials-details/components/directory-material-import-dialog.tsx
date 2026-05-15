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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  DirectoryMaterialImportCreateInput,
  DirectoryMaterialImportPreviewResponse,
  DirectoryMaterialImportRowStatus,
} from "@/features/directory-materials/types"

const HEADER_ALIASES: Record<string, string> = {
  code: "code",
  код: "code",
  name: "name",
  title: "name",
  название: "name",
  наименование: "name",
  unit: "unit",
  "ед. изм.": "unit",
  "ед изм": "unit",
  единица: "unit",
  price: "price",
  price_amount: "price",
  rate: "price",
  цена: "price",
  category: "category",
  категория: "category",
  subcategory: "subcategory",
  подкатегория: "subcategory",
  supplier: "supplierName",
  supplier_name: "supplierName",
  suppliername: "supplierName",
  поставщик: "supplierName",
  description: "description",
  описание: "description",
  image_url: "imageUrl",
  imageurl: "imageUrl",
  currency_code: "currencyCode",
  currencycode: "currencyCode",
  currency: "currencyCode",
  валюта: "currencyCode",
  source_name: "sourceName",
  sourcename: "sourceName",
  источник: "sourceName",
  source_external_row_key: "sourceExternalRowKey",
  sourceexternalrowkey: "sourceExternalRowKey",
  external_id: "sourceExternalRowKey",
}

const STATUS_LABELS: Record<DirectoryMaterialImportRowStatus, string> = {
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
  return error instanceof Error ? error.message : "Не удалось выполнить импорт материалов"
}

export function DirectoryMaterialImportDialog({
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
    input: DirectoryMaterialImportCreateInput
  ) => Promise<DirectoryMaterialImportPreviewResponse["data"]>
  onApplyJob: (id: string) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [sourceName, setSourceName] = useState("")
  const [preview, setPreview] =
    useState<DirectoryMaterialImportPreviewResponse["data"] | null>(null)
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
          <DialogTitle>Импорт материалов</DialogTitle>
          <DialogDescription>
            Загрузите CSV с колонками name, unit, price, category и
            дополнительными полями. Данные сначала попадут в preview, а в
            справочник будут записаны только после подтверждения.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_240px]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="directory-material-import-file">CSV-файл</Label>
              <Input
                accept=".csv,text/csv"
                id="directory-material-import-file"
                onChange={handleFileChange}
                type="file"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="directory-material-import-source">Источник</Label>
              <Input
                id="directory-material-import-source"
                maxLength={120}
                onChange={(event) => setSourceName(event.target.value)}
                placeholder="Например: прайс поставщика"
                value={sourceName}
              />
            </div>
          </div>

          {file ? (
            <p className="text-xs/relaxed text-muted-foreground">
              Выбран файл: {file.name}, {formatBytes(file.size)}
            </p>
          ) : null}

          {preview ? (
            <div className="grid gap-3 rounded-md border border-border p-3">
              <div className="grid gap-2 text-xs/relaxed sm:grid-cols-5">
                <span>Всего: {preview.job.totalRows}</span>
                <span>Готово: {preview.job.validRows}</span>
                <span>Предупреждения: {preview.job.warningRows}</span>
                <span>Ошибки: {preview.job.errorRows}</span>
                <span>Дубли: {preview.job.duplicateRows}</span>
              </div>

              <div className="max-h-80 overflow-auto rounded-md border">
                <Table className="min-w-[720px]">
                  <TableHeader className="bg-muted text-muted-foreground">
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Название</TableHead>
                      <TableHead>Ед.</TableHead>
                      <TableHead>Цена</TableHead>
                      <TableHead>Сообщения</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 50).map((row) => {
                      const normalized = row.normalizedData as Record<string, unknown>
                      const messages = [...row.errorMessages, ...row.warningMessages]
                      return (
                        <TableRow key={row.id}>
                          <TableCell>{row.rowNumber}</TableCell>
                          <TableCell>{STATUS_LABELS[row.status]}</TableCell>
                          <TableCell>{String(normalized.name ?? "—")}</TableCell>
                          <TableCell>{String(normalized.unit ?? "—")}</TableCell>
                          <TableCell>{String(normalized.price ?? "—")}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {messages.length > 0 ? messages.join("; ") : "—"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 50 ? (
                <p className="text-xs/relaxed text-muted-foreground">
                  В preview показаны первые 50 строк из {rows.length}.
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="text-xs/relaxed text-destructive">{error}</p> : null}
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

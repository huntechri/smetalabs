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
import { parseCsvFileInBatches } from "@/features/directories/application/csv-parser"
import type { CsvImportBatch } from "@/features/directories/model/csv-import"
import type {
  DirectoryWorkImportApplyInput,
  DirectoryWorkImportApplyResponse,
  DirectoryWorkImportBatchInput,
  DirectoryWorkImportCreateInput,
  DirectoryWorkImportPreviewResponse,
  DirectoryWorkImportRowStatus,
} from "@/features/directory-works/types"

const IMPORT_BATCH_SIZE = 1500
const APPLY_BATCH_SIZE = 200

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
  onAppendBatch,
  onApplyJob,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  importing: boolean
  onCreateJob: (
    input: DirectoryWorkImportCreateInput
  ) => Promise<DirectoryWorkImportPreviewResponse["data"]>
  onAppendBatch: (
    id: string,
    input: DirectoryWorkImportBatchInput
  ) => Promise<DirectoryWorkImportPreviewResponse["data"]>
  onApplyJob: (
    id: string,
    input?: DirectoryWorkImportApplyInput
  ) => Promise<DirectoryWorkImportApplyResponse["data"]>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [sourceName, setSourceName] = useState("")
  const [preview, setPreview] = useState<
    DirectoryWorkImportPreviewResponse["data"] | null
  >(null)
  const [progress, setProgress] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setFile(null)
      setSourceName("")
      setPreview(null)
      setProgress("")
      setError(null)
    }
  }, [open])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null)
    setPreview(null)
    setProgress("")
    setError(null)
  }

  const sendBatch = async (
    jobId: string,
    batch: CsvImportBatch,
    isLastBatch: boolean
  ) => {
    const nextPreview = await onAppendBatch(jobId, { ...batch, isLastBatch })
    setPreview(nextPreview)
    setProgress(
      `Загружено строк: ${nextPreview.job.totalRows}. Пакет ${batch.batchNumber}.`
    )
    return nextPreview
  }

  const handleCreatePreview = async () => {
    if (!file) {
      setError("Выберите CSV-файл для импорта")
      return
    }

    try {
      setError(null)
      setProgress("Создаём импорт...")
      const jobData = await onCreateJob({
        rows: [],
        fileName: file.name,
        fileMimeType: file.type || "text/csv",
        fileSizeBytes: file.size,
        sourceName: sourceName.trim() || null,
        options: { batchSize: IMPORT_BATCH_SIZE },
      })

      let latestPreview = jobData
      let pendingBatch: CsvImportBatch | null = null
      for await (const batch of parseCsvFileInBatches({
        file,
        headerAliases: HEADER_ALIASES,
        batchSize: IMPORT_BATCH_SIZE,
        onProgress: ({ rowsRead, batchesRead }) =>
          setProgress(
            `Прочитано строк: ${rowsRead}. Подготовлено пакетов: ${batchesRead}.`
          ),
      })) {
        if (pendingBatch)
          latestPreview = await sendBatch(jobData.job.id, pendingBatch, false)
        pendingBatch = batch
      }

      if (!pendingBatch) {
        setProgress("")
        setError("Файл не содержит строк для импорта")
        return
      }

      latestPreview = await sendBatch(jobData.job.id, pendingBatch, true)
      setPreview(latestPreview)
      setProgress(
        `Загрузка завершена. Всего строк: ${latestPreview.job.totalRows}.`
      )
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleApply = async () => {
    if (!preview) return

    try {
      setError(null)
      let hasMore = true
      let appliedTotal = preview.job.appliedRows
      while (hasMore) {
        const response = await onApplyJob(preview.job.id, {
          batchSize: APPLY_BATCH_SIZE,
        })
        hasMore = Boolean(response.hasMore)
        appliedTotal = response.job.appliedRows
        setProgress(`Применено строк: ${appliedTotal}.`)
      }
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
            дополнительными полями. Большие файлы отправляются частями.
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
            <p className="text-xs/relaxed text-muted-foreground">
              Выбран файл: {file.name}, {formatBytes(file.size)}
            </p>
          ) : null}
          {progress ? (
            <p className="text-xs/relaxed text-muted-foreground">{progress}</p>
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
                      <TableHead>Расценка</TableHead>
                      <TableHead>Сообщения</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 50).map((row) => {
                      const normalized = row.normalizedData as Record<
                        string,
                        unknown
                      >
                      const messages = [
                        ...row.errorMessages,
                        ...row.warningMessages,
                      ]
                      return (
                        <TableRow key={row.id}>
                          <TableCell>{row.rowNumber}</TableCell>
                          <TableCell>{STATUS_LABELS[row.status]}</TableCell>
                          <TableCell>
                            {String(normalized.title ?? "—")}
                          </TableCell>
                          <TableCell>
                            {String(normalized.unit ?? "—")}
                          </TableCell>
                          <TableCell>
                            {String(normalized.rate ?? "—")}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {messages.length > 0 ? messages.join("; ") : "—"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {preview.job.totalRows > rows.length ? (
                <p className="text-xs/relaxed text-muted-foreground">
                  В preview показаны первые {rows.length} строк из{" "}
                  {preview.job.totalRows}.
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="text-xs/relaxed text-destructive">{error}</p>
          ) : null}
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

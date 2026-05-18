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
import {
  buildGlobalPurchasesImportPreviewRows,
  GLOBAL_PURCHASES_IMPORT_REQUIRED_COLUMNS,
  pickGlobalPurchasesImportValue,
} from "@/features/global-purchases/lib/global-purchases-import-parser"
import type { GlobalPurchaseMutationInput } from "@/types/global-purchases"
import type { ProjectRow } from "@/types/project"

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
    () => (fileText ? buildGlobalPurchasesImportPreviewRows(fileText, projects) : []),
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
            Загрузите CSV с колонками: {GLOBAL_PURCHASES_IMPORT_REQUIRED_COLUMNS}. Строки с ошибками не будут импортированы.
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
            const sourceTitle = pickGlobalPurchasesImportValue(row.source, ["Наименование", "Название", "Материал", "title"])
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

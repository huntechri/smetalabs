"use client"

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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { downloadImportTemplate } from "@/features/estimates/lib/import-parsers"
import { useEstimateImport } from "@/features/estimates/hooks/use-estimate-import"

export function EstimateImportDialog({
  projectId,
  recordId,
  open,
  onOpenChange,
  onImportSuccess,
}: {
  projectId: string
  recordId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportSuccess: () => void
}) {
  const {
    fileName,
    parsedRows,
    validRows,
    errorRows,
    error,
    result,
    importing,
    handleFileChange,
    handleApply,
    handleOpenChange,
  } = useEstimateImport({
    projectId,
    recordId,
    onImportSuccess,
    onOpenChange,
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[min(720px,calc(100vh-4rem))] max-h-[calc(100vh-4rem)] flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Импорт сметы</DialogTitle>
          <DialogDescription>
            Скачайте шаблон Excel, заполните его разделами, работами и
            материалами, и загрузите обратно.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              accept=".csv,.xlsx"
              type="file"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              onClick={downloadImportTemplate}
            >
              Скачать шаблон
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            {fileName ? `Выбран файл: ${fileName}` : "Файл не выбран"}
          </div>
          <FieldError>{error}</FieldError>
          {result ? (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
              {result}
            </div>
          ) : null}
        </div>

        <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto rounded-md border border-border">
          {parsedRows.length === 0 ? (
            <Empty className="h-full min-h-80 border-0">
              <EmptyHeader>
                <EmptyTitle>Нет строк для предпросмотра</EmptyTitle>
                <EmptyDescription>
                  Выберите XLSX или CSV файл с заполненным шаблоном сметы.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {parsedRows.map((row) => (
            <Card
              key={row.index}
              className="m-2 rounded-md border border-border/40 bg-transparent p-0 shadow-none"
            >
              <CardContent className="grid gap-2 p-3 sm:grid-cols-[100px_minmax(0,1fr)_160px] sm:items-center">
                <div className="text-xs text-muted-foreground">
                  Строка {row.index} ·{" "}
                  <span className="text-[10px] font-semibold uppercase">
                    {row.type === "section"
                      ? "Раздел"
                      : row.type === "work"
                        ? "Работа"
                        : "Материал"}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {row.title || "—"}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {row.type !== "section" ? (
                      <>
                        {row.quantity ?? 0} {row.unitLabel} × {row.price ?? 0} ₽
                        {row.consumption !== null
                          ? ` (Расход: ${row.consumption})`
                          : ""}
                      </>
                    ) : (
                      "Новый раздел сметы"
                    )}
                    {row.sectionTitle ? ` [Раздел: ${row.sectionTitle}]` : ""}
                  </div>
                </div>
                <div
                  className={
                    row.status === "valid"
                      ? "text-xs text-muted-foreground"
                      : "text-xs text-destructive"
                  }
                >
                  {row.status === "valid" ? (
                    "Готово"
                  ) : (
                    <span className="font-medium">{row.errors.join("; ")}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter className="shrink-0">
          <div className="mr-auto text-xs text-muted-foreground">
            Корректных: {validRows.length}. С ошибками: {errorRows.length}.
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={importing}
          >
            Отмена
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={importing || validRows.length === 0}
          >
            Импортировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

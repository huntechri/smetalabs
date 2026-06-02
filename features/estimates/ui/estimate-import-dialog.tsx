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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { importProjectEstimateContent } from "@/features/estimates/api/project-estimate-content-client"

export type ParsedRow = {
  index: number
  sectionTitle: string | null
  type: "section" | "work" | "material"
  code: string | null
  title: string
  unitLabel: string | null
  quantity: number | null
  price: number | null
  consumption: number | null
  notes: string | null
  imageUrl?: string | null
  status: "valid" | "error"
  errors: string[]
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ")
}

function parseNumber(value: any) {
  if (value === null || value === undefined) return null
  const str = String(value).trim().replace(/\s/g, "").replace(",", ".")
  if (!str) return null
  const parsed = Number(str)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
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

function parseCsvText(text: string): ParsedRow[] {
  const lines = text
    .replace(/^\ufeff/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const delimiter =
    (lines[0]!.match(/;/g)?.length ?? 0) >= (lines[0]!.match(/,/g)?.length ?? 0)
      ? ";"
      : ","
  const headers = splitDelimitedLine(lines[0]!, delimiter).map(normalizeKey)

  const getColIndex = (names: string[]) => {
    for (const name of names) {
      const idx = headers.indexOf(normalizeKey(name))
      if (idx !== -1) return idx
    }
    return -1
  }

  const sectionIdx = getColIndex(["Раздел", "Section"])
  const typeIdx = getColIndex(["Тип", "Type"])
  const codeIdx = getColIndex(["Код", "Code"])
  const titleIdx = getColIndex(["Наименование", "Название", "Title", "Name"])
  const unitIdx = getColIndex(["Ед. изм.", "Ед изм", "Единица", "Unit"])
  const qtyIdx = getColIndex(["Кол-во", "Количество", "Qty", "Quantity"])
  const priceIdx = getColIndex(["Цена", "Стоимость", "Price"])
  const consumptionIdx = getColIndex(["Коэф. расхода", "Расход", "Consumption"])
  const notesIdx = getColIndex([
    "Примечание",
    "Комментарий",
    "Notes",
    "Description",
  ])
  const imageUrlIdx = getColIndex([
    "Ссылка на изображение",
    "Ссылка на картинку",
    "Изображение",
    "ImageUrl",
    "Image",
  ])

  return lines.slice(1).map((line, index) => {
    const cells = splitDelimitedLine(line, delimiter)

    const getVal = (colIdx: number) => {
      if (colIdx === -1) return null
      return cells[colIdx] ?? null
    }

    const title = String(getVal(titleIdx) || "").trim()
    const rawType = String(getVal(typeIdx) || "")
      .trim()
      .toLowerCase()
    let type: "section" | "work" | "material" = "work"
    if (rawType.includes("раздел") || rawType.includes("section"))
      type = "section"
    else if (rawType.includes("материал") || rawType.includes("material"))
      type = "material"
    else if (rawType.includes("работа") || rawType.includes("work"))
      type = "work"

    const sectionTitle = String(getVal(sectionIdx) || "").trim() || null
    const code = String(getVal(codeIdx) || "").trim() || null
    const unitLabel = String(getVal(unitIdx) || "").trim() || null
    const quantity = parseNumber(getVal(qtyIdx))
    const price = parseNumber(getVal(priceIdx))
    const consumption = parseNumber(getVal(consumptionIdx))
    const notes = String(getVal(notesIdx) || "").trim() || null
    const imageUrl = String(getVal(imageUrlIdx) || "").trim() || null

    const errors: string[] = []
    if (!title) errors.push("Нет наименования")
    if (type !== "section" && !unitLabel) errors.push("Нет единицы измерения")
    if (type !== "section" && quantity === null)
      errors.push("Некорректное количество")
    if (type !== "section" && price === null) errors.push("Некорректная цена")

    return {
      index: index + 2,
      sectionTitle,
      type,
      code,
      title,
      unitLabel,
      quantity,
      price,
      consumption,
      notes,
      imageUrl,
      status: errors.length === 0 ? "valid" : "error",
      errors,
    }
  })
}

async function parseXlsxFile(file: File): Promise<ParsedRow[]> {
  const ExcelJS = await import("exceljs")
  const Workbook =
    ExcelJS.Workbook ||
    (ExcelJS as any).default?.Workbook ||
    (ExcelJS as any).default
  const workbook = new Workbook()

  const arrayBuffer = await file.arrayBuffer()
  await workbook.xlsx.load(arrayBuffer)
  const worksheet =
    workbook.worksheets.find((w) => w.name === "Для импорта") ||
    workbook.worksheets[0]
  if (!worksheet) return []

  const parsed: ParsedRow[] = []

  const headerRow = worksheet.getRow(1)
  const headers: string[] = []
  headerRow.eachCell((cell) => {
    headers.push(normalizeKey(String(cell.value || "")))
  })

  const getColIndex = (names: string[]) => {
    for (const name of names) {
      const idx = headers.indexOf(normalizeKey(name))
      if (idx !== -1) return idx + 1
    }
    return -1
  }

  const sectionIdx = getColIndex(["Раздел", "Section"])
  const typeIdx = getColIndex(["Тип", "Type"])
  const codeIdx = getColIndex(["Код", "Code"])
  const titleIdx = getColIndex(["Наименование", "Название", "Title", "Name"])
  const unitIdx = getColIndex(["Ед. изм.", "Ед изм", "Единица", "Unit"])
  const qtyIdx = getColIndex(["Кол-во", "Количество", "Qty", "Quantity"])
  const priceIdx = getColIndex(["Цена", "Стоимость", "Price"])
  const consumptionIdx = getColIndex(["Коэф. расхода", "Расход", "Consumption"])
  const notesIdx = getColIndex([
    "Примечание",
    "Комментарий",
    "Notes",
    "Description",
  ])
  const imageUrlIdx = getColIndex([
    "Ссылка на изображение",
    "Ссылка на картинку",
    "Изображение",
    "ImageUrl",
    "Image",
  ])

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    const getVal = (colIdx: number) => {
      if (colIdx === -1) return null
      const cell = row.getCell(colIdx)
      if (cell.value && typeof cell.value === "object") {
        if ("result" in cell.value) return cell.value.result
        if ("formula" in cell.value) return cell.value.result || null
        if ("text" in cell.value) return cell.value.text
      }
      return cell.value
    }

    const title = String(getVal(titleIdx) || "").trim()
    if (!title) return

    const rawType = String(getVal(typeIdx) || "")
      .trim()
      .toLowerCase()
    let type: "section" | "work" | "material" = "work"
    if (rawType.includes("раздел") || rawType.includes("section"))
      type = "section"
    else if (rawType.includes("материал") || rawType.includes("material"))
      type = "material"
    else if (rawType.includes("работа") || rawType.includes("work"))
      type = "work"

    const sectionTitle = String(getVal(sectionIdx) || "").trim() || null
    const code = String(getVal(codeIdx) || "").trim() || null
    const unitLabel = String(getVal(unitIdx) || "").trim() || null
    const quantity = parseNumber(getVal(qtyIdx))
    const price = parseNumber(getVal(priceIdx))
    const consumption = parseNumber(getVal(consumptionIdx))
    const notes = String(getVal(notesIdx) || "").trim() || null
    const imageUrl = String(getVal(imageUrlIdx) || "").trim() || null

    const errors: string[] = []
    if (type !== "section" && !unitLabel) errors.push("Нет единицы измерения")
    if (type !== "section" && quantity === null)
      errors.push("Некорректное количество")
    if (type !== "section" && price === null) errors.push("Некорректная цена")

    parsed.push({
      index: rowNumber,
      sectionTitle,
      type,
      code,
      title,
      unitLabel,
      quantity,
      price,
      consumption,
      notes,
      imageUrl,
      status: errors.length === 0 ? "valid" : "error",
      errors,
    })
  })

  return parsed
}

async function downloadImportTemplate() {
  const ExcelJS = await import("exceljs")
  const Workbook =
    ExcelJS.Workbook ||
    (ExcelJS as any).default?.Workbook ||
    (ExcelJS as any).default
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet("Шаблон сметы", {
    views: [{ showGridLines: true }],
  })

  worksheet.columns = [
    { key: "section", width: 22 },
    { key: "type", width: 12 },
    { key: "code", width: 12 },
    { key: "title", width: 35 },
    { key: "unit", width: 10 },
    { key: "qty", width: 12 },
    { key: "price", width: 12 },
    { key: "consumption", width: 15 },
    { key: "notes", width: 25 },
    { key: "imageUrl", width: 35 },
  ]

  worksheet.addRow([
    "Раздел",
    "Тип",
    "Код",
    "Наименование",
    "Ед. изм.",
    "Кол-во",
    "Цена",
    "Коэф. расхода",
    "Примечание",
    "Ссылка на изображение",
  ])

  worksheet.getRow(1).eachCell((cell) => {
    cell.font = {
      name: "Arial",
      size: 10,
      bold: true,
      color: { argb: "FFFFFF" },
    }
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1E293B" },
    }
  })

  worksheet.addRow([
    "Демонтаж и подготовка",
    "Раздел",
    "",
    "Подготовка комнат к ремонту",
    "",
    "",
    "",
    "",
    "Демонтажные работы",
    "",
  ])

  worksheet.addRow([
    "Демонтаж и подготовка",
    "Работа",
    "DEM-01",
    "Демонтаж кирпичных стен",
    "м2",
    45,
    450,
    "",
    "Стены в полкирпича",
    "",
  ])

  worksheet.addRow([
    "Демонтаж и подготовка",
    "Материал",
    "MAT-01",
    "Мешки строительные",
    "шт",
    120,
    30,
    2.6,
    "Для вывоза мусора",
    "https://images.unsplash.com/photo-1589939705384-5185137a7f0f",
  ])

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "template-estimate-import.xlsx"
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

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
  const [fileName, setFileName] = useState("")
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const validRows = parsedRows.filter((r) => r.status === "valid")
  const errorRows = parsedRows.filter((r) => r.status === "error")

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setResult(null)
    setError(null)
    setParsedRows([])

    if (!file) {
      setFileName("")
      return
    }

    setFileName(file.name)
    try {
      if (file.name.endsWith(".xlsx")) {
        const rows = await parseXlsxFile(file)
        setParsedRows(rows)
      } else {
        const text = await file.text()
        const rows = parseCsvText(text)
        setParsedRows(rows)
      }
    } catch (err) {
      setError("Не удалось прочитать файл. Убедитесь, что формат корректен.")
    }
  }

  const handleApply = async () => {
    if (validRows.length === 0) {
      setError("Нет корректных строк для импорта")
      return
    }

    const confirmed = window.confirm(
      "Внимание! Импорт перезапишет текущую смету. Существующие разделы и работы будут удалены. Продолжить?"
    )
    if (!confirmed) return

    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const payload = validRows.map((r) => ({
        sectionTitle: r.sectionTitle,
        type: r.type,
        code: r.code,
        title: r.title,
        unitLabel: r.unitLabel,
        quantity: r.quantity,
        price: r.price,
        consumption: r.consumption,
        notes: r.notes,
        imageUrl: r.imageUrl,
      }))

      await importProjectEstimateContent({ projectId, recordId, rows: payload })
      setResult("Смета успешно импортирована!")
      onImportSuccess()
      setTimeout(() => handleOpenChange(false), 1500)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось импортировать смету"
      )
    } finally {
      setImporting(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (nextOpen) return
    setFileName("")
    setParsedRows([])
    setError(null)
    setResult(null)
  }

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

import { useState, type ChangeEvent } from "react"
import { importProjectEstimateContent } from "@/features/estimates/api/project-estimate-content-client"
import {
  parseCsvText,
  parseXlsxFile,
  type ParsedRow,
} from "@/features/estimates/lib/import-parsers"

export function useEstimateImport({
  projectId,
  recordId,
  onImportSuccess,
  onOpenChange,
}: {
  projectId: string
  recordId: string
  onImportSuccess: () => void
  onOpenChange: (open: boolean) => void
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

  return {
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
  }
}

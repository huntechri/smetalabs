import {
  type CsvImportHeaderAliases,
  type CsvImportBatch,
  type CsvImportProgress,
  normalizeHeader,
  detectDelimiter,
  toRecord,
} from "../model/csv-import"

type ParseCsvFileInBatchesOptions = {
  file: File
  headerAliases: CsvImportHeaderAliases
  batchSize: number
  onProgress?: (progress: CsvImportProgress) => void
}

export async function* parseCsvFileInBatches({
  file,
  headerAliases,
  batchSize,
  onProgress,
}: ParseCsvFileInBatchesOptions): AsyncGenerator<CsvImportBatch> {
  const safeBatchSize = Math.max(1, batchSize)
  const reader = file.stream().getReader()
  const decoder = new TextDecoder("utf-8")
  let delimiter: string | null = null
  let headers: string[] | null = null
  let row: string[] = []
  let value = ""
  let quoted = false
  let pendingRows: Array<Record<string, unknown>> = []
  let rowsRead = 0
  let batchesRead = 0
  let bomHandled = false

  const pushRow = (rawRow: string[]) => {
    if (!rawRow.some((cell) => cell.trim().length > 0)) return

    if (!headers) {
      headers = rawRow.map((header) => normalizeHeader(header, headerAliases))
      return
    }

    const record = toRecord(headers, rawRow)
    if (Object.keys(record).length === 0) return

    pendingRows.push(record)
    rowsRead += 1
    onProgress?.({ rowsRead, batchesRead })
  }

  const flushBatch = () => {
    if (pendingRows.length < safeBatchSize) return null

    batchesRead += 1
    const batch: CsvImportBatch = {
      batchNumber: batchesRead,
      rowOffset: rowsRead - pendingRows.length,
      rows: pendingRows,
    }
    pendingRows = []
    onProgress?.({ rowsRead, batchesRead })
    return batch
  }

  while (true) {
    const result = await reader.read()
    const decoded = result.done
      ? decoder.decode()
      : decoder.decode(result.value, { stream: true })
    const text = bomHandled ? decoded : decoded.replace(/^\uFEFF/, "")
    bomHandled = true

    if (!delimiter && text.length > 0) delimiter = detectDelimiter(text)
    const activeDelimiter = delimiter ?? ","

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index]
      const next = text[index + 1]

      if (char === '"') {
        if (quoted && next === '"') {
          value += '"'
          index += 1
        } else {
          quoted = !quoted
        }
        continue
      }

      if (!quoted && char === activeDelimiter) {
        row.push(value.trim())
        value = ""
        continue
      }

      if (!quoted && (char === "\n" || char === "\r")) {
        if (char === "\r" && next === "\n") index += 1
        row.push(value.trim())
        pushRow(row)
        row = []
        value = ""

        const batch = flushBatch()
        if (batch) yield batch
        continue
      }

      value += char
    }

    if (result.done) break
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value.trim())
    pushRow(row)
  }

  if (pendingRows.length > 0) {
    batchesRead += 1
    yield {
      batchNumber: batchesRead,
      rowOffset: rowsRead - pendingRows.length,
      rows: pendingRows,
    }
    onProgress?.({ rowsRead, batchesRead })
  }
}
export type { CsvImportHeaderAliases, CsvImportBatch, CsvImportProgress }

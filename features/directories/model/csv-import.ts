export type CsvImportHeaderAliases = Record<string, string>

export type CsvImportBatch = {
  batchNumber: number
  rowOffset: number
  rows: Array<Record<string, unknown>>
}

export type CsvImportProgress = {
  rowsRead: number
  batchesRead: number
}

export function normalizeHeader(header: string, aliases: CsvImportHeaderAliases) {
  const key = header
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/-/g, "_")
  return aliases[key] ?? key.replace(/\s+/g, "_")
}

export function detectDelimiter(sample: string) {
  const firstLine = sample.split(/\r?\n/, 1)[0] ?? ""
  const candidates = [
    { delimiter: "\t", count: (firstLine.match(/\t/g) ?? []).length },
    { delimiter: ";", count: (firstLine.match(/;/g) ?? []).length },
    { delimiter: ",", count: (firstLine.match(/,/g) ?? []).length },
  ]

  return candidates.sort((a, b) => b.count - a.count)[0]?.delimiter ?? ","
}

export function normalizeCellValue(header: string, value: string) {
  if (header !== "currencyCode" && header !== "currency_code") return value

  const normalized = value.trim().toLowerCase().replace(/\s+/g, "")
  if (["руб", "руб.", "р", "р.", "₽", "rur", "rub"].includes(normalized))
    return "RUB"
  return value
}

export function toRecord(headers: string[], row: string[]) {
  const record: Record<string, unknown> = {}

  headers.forEach((header, index) => {
    const value = row[index]?.trim()
    if (header && value) record[header] = normalizeCellValue(header, value)
  })

  return record
}

import type { GlobalPurchaseMutationInput } from "@/types/global-purchases"
import type { ProjectRow } from "@/types/project"

export type GlobalPurchasesImportPreviewRow = {
  index: number
  input: GlobalPurchaseMutationInput | null
  status: "valid" | "error"
  errors: string[]
  source: Record<string, string>
}

export const GLOBAL_PURCHASES_IMPORT_REQUIRED_COLUMNS =
  "Наименование;Ед. изм.;Кол-во факт;Цена факт;Объект;Дата;Примечание"

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

  const delimiter =
    (lines[0]!.match(/;/g)?.length ?? 0) >= (lines[0]!.match(/,/g)?.length ?? 0) ? ";" : ","
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

export function pickGlobalPurchasesImportValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeKey(key)]
    if (value !== undefined) return value
  }
  return ""
}

export function buildGlobalPurchasesImportPreviewRows(
  text: string,
  projects: ProjectRow[]
): GlobalPurchasesImportPreviewRow[] {
  const projectsByTitle = new Map(projects.map((project) => [normalizeKey(project.title), project]))

  return parseDelimited(text).map((row, index) => {
    const errors: string[] = []
    const title = normalizeText(pickGlobalPurchasesImportValue(row, ["Наименование", "Название", "Материал", "title"]))
    const unit = normalizeText(pickGlobalPurchasesImportValue(row, ["Ед. изм.", "Ед изм", "Единица", "unit"]))
    const factQuantity = parseNumber(pickGlobalPurchasesImportValue(row, ["Кол-во факт", "Количество факт", "Количество", "factQuantity"]))
    const factPrice = parseNumber(pickGlobalPurchasesImportValue(row, ["Цена факт", "Цена", "factPrice"]))
    const planQuantity = parseNumber(pickGlobalPurchasesImportValue(row, ["Кол-во план", "Количество план", "planQuantity"])) ?? 0
    const planPrice = parseNumber(pickGlobalPurchasesImportValue(row, ["Цена план", "planPrice"])) ?? factPrice ?? 0
    const projectTitle = normalizeText(pickGlobalPurchasesImportValue(row, ["Объект", "Проект", "project"]))
    const project = projectTitle ? projectsByTitle.get(normalizeKey(projectTitle)) : null
    const purchaseDate = parseDate(pickGlobalPurchasesImportValue(row, ["Дата", "Дата закупки", "purchaseDate"]))
    const notes = normalizeText(pickGlobalPurchasesImportValue(row, ["Примечание", "Комментарий", "notes"]))

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

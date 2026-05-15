import type {
  DirectoryMaterial,
  DirectoryMaterialsExportFile,
  DirectoryMaterialsExportFormat,
} from "../types"

const CSV_HEADERS = [
  "Код",
  "Название",
  "Ед. изм.",
  "Цена",
  "Валюта",
  "Категория",
  "Подкатегория",
  "Поставщик",
  "Статус",
  "Обновлено",
]

function escapeCsvCell(value: string | number | null | undefined) {
  const raw = value === null || value === undefined ? "" : String(value)
  const escaped = raw.replace(/"/g, '""')
  return `"${escaped}"`
}

function buildCsv(materials: DirectoryMaterial[]) {
  const rows = materials.map((material) => [
    material.code,
    material.name,
    material.unit,
    material.priceAmount,
    material.currencyCode,
    material.category,
    material.subcategory,
    material.supplierName,
    material.status,
    material.metadata.updatedAt,
  ])

  return [CSV_HEADERS, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n")
}

export function buildDirectoryMaterialsExportFile(
  materials: DirectoryMaterial[],
  format: DirectoryMaterialsExportFormat
): DirectoryMaterialsExportFile {
  if (format !== "csv") {
    throw new Error("Неподдерживаемый формат экспорта материалов")
  }

  return {
    body: `\ufeff${buildCsv(materials)}\n`,
    contentType: "text/csv; charset=utf-8",
    extension: "csv",
  }
}

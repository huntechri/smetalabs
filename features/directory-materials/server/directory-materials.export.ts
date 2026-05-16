import type {
  DirectoryMaterial,
  DirectoryMaterialsExportFile,
  DirectoryMaterialsExportFormat,
} from "../types"

const CSV_COLUMNS: Array<{
  label: string
  value: (material: DirectoryMaterial) => string | number | null
}> = [
  { label: "Код", value: (material) => material.code },
  { label: "Название", value: (material) => material.name },
  { label: "Ед. изм.", value: (material) => material.unitLabel || material.unit },
  { label: "Цена", value: (material) => material.priceAmount },
  { label: "Валюта", value: (material) => material.currencyCode },
  { label: "Категория", value: (material) => material.category },
  { label: "Подкатегория", value: (material) => material.subcategory },
  { label: "Поставщик", value: (material) => material.supplierName },
  { label: "Синонимы", value: (material) => material.aliases.join("; ") },
  { label: "Ключевые слова", value: (material) => material.keywords.join("; ") },
  { label: "Описание", value: (material) => material.description },
  { label: "Ссылка на изображение", value: (material) => material.imageUrl },
]

function escapeCsvCell(value: string | number | null | undefined) {
  const raw = value === null || value === undefined ? "" : String(value)
  const escaped = raw.replace(/"/g, '""')
  return `"${escaped}"`
}

function buildCsv(materials: DirectoryMaterial[]) {
  const rows = materials.map((material) =>
    CSV_COLUMNS.map((column) => column.value(material))
  )

  return [CSV_COLUMNS.map((column) => column.label), ...rows]
    .map((row) => row.map(escapeCsvCell).join(";"))
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

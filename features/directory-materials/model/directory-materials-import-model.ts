import type {
  DirectoryMaterialImportJob,
  DirectoryMaterialImportRowStatus,
} from "../types"

export const DIRECTORY_MATERIAL_IMPORT_BATCH_SIZE = 300
export const DIRECTORY_MATERIAL_IMPORT_APPLY_BATCH_SIZE = 500

export const DIRECTORY_MATERIAL_IMPORT_HEADER_ALIASES: Record<string, string> = {
  code: "code",
  код: "code",
  name: "name",
  title: "name",
  название: "name",
  наименование: "name",
  unit: "unit",
  "ед. изм.": "unit",
  "ед изм": "unit",
  единица: "unit",
  price: "price",
  price_amount: "price",
  rate: "price",
  цена: "price",
  category: "category",
  категория: "category",
  subcategory: "subcategory",
  подкатегория: "subcategory",
  supplier: "supplierName",
  supplier_name: "supplierName",
  suppliername: "supplierName",
  поставщик: "supplierName",
  description: "description",
  описание: "description",
  image_url: "imageUrl",
  imageurl: "imageUrl",
  "ссылка на изображение": "imageUrl",
  currency_code: "currencyCode",
  currencycode: "currencyCode",
  currency: "currencyCode",
  валюта: "currencyCode",
  source_name: "sourceName",
  sourcename: "sourceName",
  источник: "sourceName",
  source_external_row_key: "sourceExternalRowKey",
  sourceexternalrowkey: "sourceExternalRowKey",
  external_id: "sourceExternalRowKey",
}

export const DIRECTORY_MATERIAL_IMPORT_STATUS_LABELS: Record<
  DirectoryMaterialImportRowStatus,
  string
> = {
  pending: "Ожидает",
  valid: "Готово",
  warning: "Предупреждение",
  error: "Ошибка",
  duplicate: "Дубль",
  conflict: "Конфликт",
  applied: "Применено",
  skipped: "Пропущено",
}

export function canApplyDirectoryMaterialImportJob(
  job: DirectoryMaterialImportJob | null | undefined
) {
  if (!job) return false
  return (
    (job.status === "ready_for_review" || job.status === "applying") &&
    job.validRows + job.warningRows > 0
  )
}

export function formatDirectoryMaterialImportBytes(
  bytes: number | null | undefined
) {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

export function getDirectoryMaterialImportErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Не удалось выполнить импорт материалов"
}

export function getDirectoryMaterialImportProgressMessage({
  rowsRead,
  batchesRead,
}: {
  rowsRead: number
  batchesRead: number
}) {
  return `Прочитано строк: ${rowsRead}. Подготовлено пакетов: ${batchesRead}.`
}

export function getDirectoryMaterialImportBatchProgressMessage({
  totalRows,
  batchNumber,
}: {
  totalRows: number
  batchNumber: number
}) {
  return `Загружено строк: ${totalRows}. Пакет ${batchNumber}.`
}

export function getDirectoryMaterialImportCompletedMessage(totalRows: number) {
  return `Загрузка завершена. Всего строк: ${totalRows}.`
}

export function getDirectoryMaterialImportAppliedMessage(appliedRows: number) {
  return `Применено строк: ${appliedRows}.`
}

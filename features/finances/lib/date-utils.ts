/** Преобразует ISO-строку в Date для Calendar */
export function toDateValue(value: string | null) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** Преобразует Date в ISO-строку (YYYY-MM-DD) */
export function toIsoDate(value: Date | undefined) {
  if (!value) return ""
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Форматирует дату для отображения: ISO-строка → ru-RU */
export function formatDisplayDate(value: string) {
  if (!value) return "Выберите дату"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("ru-RU")
}

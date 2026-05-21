export function safeNumber(value: string): number | undefined {
  const trimmed = value.trim().replace(",", ".")
  if (!trimmed) return undefined
  const num = Number(trimmed)
  return Number.isFinite(num) ? num : undefined
}

export function parseDecimal(value: FormDataEntryValue | null, fallback?: number) {
  const raw = String(value ?? "").replace(",", ".").trim()
  if (!raw) return fallback

  const number = Number(raw)
  return Number.isFinite(number) ? number : fallback
}

export function parseText(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim()
  return result || null
}

export function formatEstimateStatusText(status: string) {
  if (status === "completed") return "Завершена"
  if (status === "in_progress") return "В работе"
  return "Новая"
}

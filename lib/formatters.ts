const currency = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "RUB",
})

export function formatMoney(value: number) {
  return currency.format(value).replace("RUB", "₽")
}

export function formatConsumption(value: number) {
  if (value > 0 && value < 0.000001) {
    return "0,000001"
  }

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  }).format(value)
}

export function parseDecimalInput(value: string) {
  return Number(value.replace(",", "."))
}

export function formatDate(date: Date | undefined): string {
  if (!date) return "Выбрать"
  const d = String(date.getDate()).padStart(2, "0")
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const y = date.getFullYear()
  return `${d}.${m}.${y}`
}

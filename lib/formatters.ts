const currency = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "RUB",
})

export function formatMoney(value: number) {
  return currency.format(value).replace("RUB", "₽")
}

export function formatConsumption(value: number) {
  if (value > 0 && value < 0.001) {
    return "0,001"
  }

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 3,
    minimumFractionDigits: 0,
  }).format(value)
}

export function parseDecimalInput(value: string) {
  return Number(value.replace(",", "."))
}

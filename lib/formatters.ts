const currency = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
  style: "currency",
  currency: "RUB",
})

export function formatMoney(value: number) {
  return currency.format(value).replace("RUB", "₽")
}

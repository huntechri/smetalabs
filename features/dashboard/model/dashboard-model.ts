export type ChartDataItem = {
  date: string
  inflow: number
  outflow: number
  balance: number
}

/**
 * Форматирует диапазон дат для отображения в списке проектов.
 */
export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start && !end) return "Сроки не указаны"
  if (start && end) {
    const format = (dateStr: string) => {
      const parts = dateStr.split("-")
      if (parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0]}`
      }
      return dateStr
    }
    return `${format(start)} – ${format(end)}`
  }
  return start || end || ""
}

/**
 * Подготавливает данные для графика, инвертируя расходы в отрицательные значения.
 */
export function prepareChartData(chartData: ChartDataItem[]): (ChartDataItem & { outflow: number })[] {
  return chartData.map((d) => ({
    ...d,
    outflow: -Math.abs(d.outflow),
  }))
}

/**
 * Рассчитывает верхнюю, нижнюю границы оси Y и смещение градиента на основе данных графика.
 */
export function calculateChartBounds(processedChartData: { balance: number; inflow: number; outflow: number }[]) {
  if (!processedChartData.length) {
    return { minVal: 0, maxVal: 0, off: 0.5 }
  }
  const balances = processedChartData.map((d) => d.balance)
  const inflows = processedChartData.map((d) => d.inflow)
  const outflows = processedChartData.map((d) => d.outflow)

  const maxBal = Math.max(...balances, 0)
  const minBal = Math.min(...balances, 0)
  const maxIn = Math.max(...inflows, 0)
  const minOut = Math.min(...outflows, 0)

  const absoluteMax = Math.max(maxBal, maxIn)
  const absoluteMin = Math.min(minBal, minOut)

  const range = absoluteMax - absoluteMin
  const padding = range * 0.05
  const domainMax = absoluteMax + padding
  const domainMin = absoluteMin >= 0 ? 0 : absoluteMin - padding

  let gradientOffset = 0.5
  if (maxBal - minBal > 0) {
    gradientOffset = maxBal / (maxBal - minBal)
  }

  return { minVal: domainMin, maxVal: domainMax, off: gradientOffset }
}

/**
 * Форматирует подписи меток оси Y для отображения на графике.
 */
export function formatYAxisTick(value: number): string {
  if (value === 0) return "0"
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} млн`
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)} тыс`
  }
  return String(value)
}

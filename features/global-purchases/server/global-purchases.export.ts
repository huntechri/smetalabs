import type {
  GlobalPurchaseRow,
  GlobalPurchasesExportFile,
  GlobalPurchasesExportFormat,
} from "@/types/global-purchases"

const STATUS_LABELS: Record<GlobalPurchaseRow["status"], string> = {
  planned: "Запланировано",
  ordered: "Заказано",
  partially_received: "Частично получено",
  received: "Получено",
  cancelled: "Отменено",
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatNumber(value: number | null | undefined, digits = 3) {
  if (value === null || value === undefined) return ""
  return value.toLocaleString("ru-RU", { maximumFractionDigits: digits })
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return ""
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })
}

function formatDate(value: string | null | undefined) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("ru-RU")
}

function buildRows(purchases: GlobalPurchaseRow[]) {
  return purchases
    .map((purchase, index) => {
      const projectTitle = purchase.projectTitle ?? "Без объекта"
      const factQuantity = purchase.factQuantity ?? null
      const factPrice = purchase.factPrice ?? null
      const factTotal = purchase.factTotal ?? null
      const deviationTotal = purchase.deviationTotal ?? null

      return `<tr>
        <td class="center">${index + 1}</td>
        <td>${escapeHtml(projectTitle)}</td>
        <td class="center">${escapeHtml(formatDate(purchase.purchaseDate))}</td>
        <td>${escapeHtml(purchase.title)}</td>
        <td class="center">${escapeHtml(purchase.unit)}</td>
        <td class="number">${escapeHtml(formatNumber(purchase.planQuantity))}</td>
        <td class="number">${escapeHtml(formatNumber(factQuantity))}</td>
        <td class="money">${escapeHtml(formatMoney(purchase.planPrice))}</td>
        <td class="money">${escapeHtml(formatMoney(factPrice))}</td>
        <td class="money">${escapeHtml(formatMoney(purchase.planTotal))}</td>
        <td class="money">${escapeHtml(formatMoney(factTotal))}</td>
        <td class="money">${escapeHtml(formatMoney(deviationTotal))}</td>
        <td>${escapeHtml(STATUS_LABELS[purchase.status])}</td>
        <td>${escapeHtml(purchase.notes)}</td>
      </tr>`
    })
    .join("\n")
}

function buildSummaryRows(purchases: GlobalPurchaseRow[]) {
  const planTotal = purchases.reduce((sum, row) => sum + row.planTotal, 0)
  const factTotal = purchases.reduce((sum, row) => sum + (row.factTotal ?? 0), 0)
  const deviationTotal = planTotal - factTotal

  return `<tr class="summary">
    <td colspan="9">Итого</td>
    <td class="money">${escapeHtml(formatMoney(planTotal))}</td>
    <td class="money">${escapeHtml(formatMoney(factTotal))}</td>
    <td class="money">${escapeHtml(formatMoney(deviationTotal))}</td>
    <td colspan="2"></td>
  </tr>`
}

function buildExcelHtml(purchases: GlobalPurchaseRow[]) {
  const exportedAt = new Date().toLocaleString("ru-RU")
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    .meta { color: #666; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #1f2937; color: #fff; font-weight: 700; text-align: center; }
    th, td { border: 1px solid #9ca3af; padding: 6px 8px; vertical-align: top; }
    td.number, td.money { text-align: right; mso-number-format:"0\\,00"; }
    td.center { text-align: center; }
    tr.summary td { background: #f3f4f6; font-weight: 700; }
  </style>
</head>
<body>
  <h1>Глобальные закупки</h1>
  <div class="meta">Выгружено: ${escapeHtml(exportedAt)}. Строк: ${purchases.length}.</div>
  <table>
    <thead>
      <tr>
        <th>№</th>
        <th>Объект</th>
        <th>Дата</th>
        <th>Наименование</th>
        <th>Ед. изм.</th>
        <th>Кол-во план</th>
        <th>Кол-во факт</th>
        <th>Цена план</th>
        <th>Цена факт</th>
        <th>Сумма план</th>
        <th>Сумма факт</th>
        <th>Отклонение</th>
        <th>Статус</th>
        <th>Примечание</th>
      </tr>
    </thead>
    <tbody>
      ${buildRows(purchases)}
      ${buildSummaryRows(purchases)}
    </tbody>
  </table>
</body>
</html>`
}

export function buildGlobalPurchasesExportFile(
  purchases: GlobalPurchaseRow[],
  format: GlobalPurchasesExportFormat
): GlobalPurchasesExportFile {
  if (format !== "xls") {
    throw new Error("Неподдерживаемый формат экспорта закупок")
  }

  return {
    body: `\ufeff${buildExcelHtml(purchases)}`,
    contentType: "application/vnd.ms-excel; charset=utf-8",
    extension: "xls",
  }
}

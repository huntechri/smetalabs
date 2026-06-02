import type {
  ProjectMutationInput,
  ProjectRow,
  ProjectStatus,
  ProjectsListParams,
  ProjectsSort,
} from "@/types/project"
import type {
  ProjectEstimateRecordRow,
  ProjectEstimateRecordStatus,
} from "@/types/project-estimate-record"

// ─── Project Form State & Mapping ──────────────────────────────────────────────

export type ProjectFormState = {
  title: string
  customerCounterpartyId: string
  address: string
  startDate: string
  endDate: string
  status: ProjectStatus
}

export const emptyProjectFormState: ProjectFormState = {
  title: "",
  customerCounterpartyId: "",
  address: "",
  startDate: "",
  endDate: "",
  status: "new",
}

export function getProjectInitialFormState(
  project?: ProjectRow | null
): ProjectFormState {
  if (!project) return emptyProjectFormState

  return {
    title: project.title,
    customerCounterpartyId: project.customerCounterpartyId ?? "",
    address: project.address ?? "",
    startDate: project.startDate ?? "",
    endDate: project.endDate ?? "",
    status: project.status,
  }
}

function nullable(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function getProjectErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Не удалось сохранить проект"
}

export function buildProjectMutationInput(
  form: ProjectFormState
): ProjectMutationInput {
  return {
    title: form.title.trim(),
    customerCounterpartyId: nullable(form.customerCounterpartyId),
    address: nullable(form.address),
    startDate: nullable(form.startDate),
    endDate: nullable(form.endDate),
    status: form.status,
  }
}

// ─── Date Parsing & Formatting ───────────────────────────────────────────────

export function parseDate(value: string): Date | undefined {
  if (!value) return undefined
  const date = new Date(value + "T00:00:00")
  return isNaN(date.getTime()) ? undefined : date
}

export function toDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function formatDisplayDate(value: string): string {
  const date = parseDate(value)
  if (!date) return value
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// ─── Project Card Helpers ────────────────────────────────────────────────────

export const PROJECT_STATUS_CONFIG: Record<
  ProjectStatus,
  {
    label: string
    dotClass: string
    badgeVariant: "default" | "secondary"
    badgeClassName?: string
  }
> = {
  new: {
    label: "Новый",
    dotClass: "bg-blue-500",
    badgeVariant: "default",
    badgeClassName:
      "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  in_progress: {
    label: "В работе",
    dotClass: "bg-emerald-500",
    badgeVariant: "default",
  },
  completed: {
    label: "Завершён",
    dotClass: "bg-slate-400",
    badgeVariant: "secondary",
  },
}

export function formatProjectMoney(value: number | null): string {
  if (value === null) return "Бюджет не указан"
  return value.toLocaleString("ru-RU") + " ₽"
}

export function formatProjectDateRange(
  start?: string | null,
  end?: string | null
): string {
  if (!start && !end) return "Сроки не указаны"
  if (start && end) return `${start} – ${end}`
  return start || end || ""
}

// ─── Search / URL Parameters Parsing ─────────────────────────────────────────

type ReadonlySearchParams = {
  get: (name: string) => string | null
}

export function getStringParam(
  searchParams: ReadonlySearchParams,
  key: string
): string | undefined {
  const value = searchParams.get(key)?.trim()
  return value || undefined
}

export function getNumberParam(
  searchParams: ReadonlySearchParams,
  key: string
): number | undefined {
  const value = searchParams.get(key)
  if (!value) return undefined

  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined
}

export function getStatusParam(
  searchParams: ReadonlySearchParams
): ProjectStatus | "all" {
  const status = searchParams.get("status")
  if (status === "new" || status === "in_progress" || status === "completed")
    return status
  return "all"
}

export function getSortParam(
  searchParams: ReadonlySearchParams
): ProjectsSort | undefined {
  const sort = searchParams.get("sort")
  if (sort === "relevance" || sort === "updated_desc" || sort === "title_asc")
    return sort
  return undefined
}

export function getProjectsListParams(
  searchParams: ReadonlySearchParams
): ProjectsListParams {
  return {
    q: getStringParam(searchParams, "q"),
    status: getStatusParam(searchParams),
    limit: getNumberParam(searchParams, "limit") ?? 50,
    cursor: getNumberParam(searchParams, "cursor") ?? 0,
    sort: getSortParam(searchParams) ?? "relevance",
  }
}

// ─── Dashboard Stats & Chart Calculations ────────────────────────────────────

export type ChartPoint = {
  date: string
  inflow: number
  outflow: number
  balance: number
}

export function formatDateLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function processChartData(
  transactions: { type: "payment" | "purchase"; amount: number; date: string }[],
  timeRange: string
): ChartPoint[] {
  if (!transactions || transactions.length === 0) return []

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let startDate = new Date(today)
  if (timeRange === "7d") {
    startDate.setDate(today.getDate() - 7)
  } else if (timeRange === "30d") {
    startDate.setDate(today.getDate() - 30)
  } else if (timeRange === "90d") {
    startDate.setDate(today.getDate() - 90)
  } else {
    // Default to the first transaction date
    const firstTx = transactions[0]
    if (firstTx) {
      const [y, m, d] = firstTx.date.split("-").map(Number)
      startDate = new Date(y, m - 1, d)
    } else {
      startDate.setDate(today.getDate() - 30)
    }
  }
  startDate.setHours(0, 0, 0, 0)

  // 1. Calculate starting totals (before startDate)
  let cumulativeInflow = 0
  let cumulativeOutflow = 0

  transactions.forEach((t) => {
    const tDate = parseDateLocal(t.date)
    if (tDate.getTime() < startDate.getTime()) {
      if (t.type === "payment") {
        cumulativeInflow += t.amount
      } else {
        cumulativeOutflow += t.amount
      }
    }
  })

  // 2. Generate all dates in the range (local time strings)
  const dates: string[] = []
  const current = new Date(startDate.getTime())
  const todayStr = formatDateLocal(today)

  let safety = 0
  if (startDate.getTime() <= today.getTime()) {
    while (safety < 1000) {
      const curStr = formatDateLocal(current)
      dates.push(curStr)
      if (curStr === todayStr) break
      current.setDate(current.getDate() + 1)
      safety++
    }
  } else {
    dates.push(todayStr)
  }

  // 3. Map daily transactions
  const dailyTransactions = new Map<string, { inflow: number; outflow: number }>()
  dates.forEach((d) => dailyTransactions.set(d, { inflow: 0, outflow: 0 }))

  transactions.forEach((t) => {
    const daily = dailyTransactions.get(t.date)
    if (daily) {
      if (t.type === "payment") {
        daily.inflow += t.amount
      } else {
        daily.outflow += t.amount
      }
    }
  })

  // 4. Build data points: inflow/outflow are daily, balance is cumulative
  const points = dates.map((d) => {
    const daily = dailyTransactions.get(d)!
    cumulativeInflow += daily.inflow
    cumulativeOutflow += daily.outflow
    return {
      date: d,
      inflow: Math.round(daily.inflow * 100) / 100,
      outflow: Math.round(daily.outflow * 100) / 100,
      balance: Math.round((cumulativeInflow - cumulativeOutflow) * 100) / 100,
    }
  })

  return points
}

// ─── Project Estimates Table Helpers & Types ─────────────────────────────────

export type EstimateRow = ProjectEstimateRecordRow

export type EstimateDialogState = {
  open: boolean
  estimate: EstimateRow | null
  name: string
  type: string
  status: ProjectEstimateRecordStatus
  error: string | null
}

export const emptyEstimateDialogState: EstimateDialogState = {
  open: false,
  estimate: null,
  name: "",
  type: "Основная",
  status: "new",
  error: null,
}

export function formatEstimateAmount(value: number) {
  return value.toLocaleString("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  })
}

export function formatEstimateDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU")
}

export function formatEstimateStatus(status: ProjectEstimateRecordStatus) {
  switch (status) {
    case "new":
      return "Новая"
    case "in_progress":
      return "В работе"
    case "completed":
      return "Завершена"
  }
}

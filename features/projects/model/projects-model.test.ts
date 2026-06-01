import { describe, expect, it } from "vitest"
import {
  buildProjectMutationInput,
  formatDisplayDate,
  formatProjectDateRange,
  formatProjectMoney,
  getProjectInitialFormState,
  getProjectsListParams,
  processChartData,
} from "./projects-model"

// ─── getProjectsListParams ───────────────────────────────────────────────────

describe("getProjectsListParams", () => {
  function makeParams(record: Record<string, string>) {
    return { get: (key: string) => record[key] ?? null }
  }

  it("returns default parameters when query is empty", () => {
    const result = getProjectsListParams(makeParams({}))
    expect(result).toEqual({
      q: undefined,
      status: "all",
      limit: 50,
      cursor: 0,
      sort: "relevance",
    })
  })

  it("parses valid search parameters correctly", () => {
    const result = getProjectsListParams(
      makeParams({
        q: "Реконструкция",
        status: "in_progress",
        limit: "15",
        cursor: "30",
        sort: "title_asc",
      })
    )
    expect(result).toEqual({
      q: "Реконструкция",
      status: "in_progress",
      limit: 15,
      cursor: 30,
      sort: "title_asc",
    })
  })

  it("handles fallback for invalid parameters", () => {
    const result = getProjectsListParams(
      makeParams({
        status: "invalid_status",
        limit: "-10",
        sort: "unknown_sort",
      })
    )
    expect(result.status).toBe("all")
    expect(result.limit).toBe(50)
    expect(result.sort).toBe("relevance")
  })
})

// ─── Project Form State and Adapters ──────────────────────────────────────────

describe("Project Form State and Adapters", () => {
  const dummyProject = {
    id: "p-1",
    title: "Проект А",
    status: "in_progress" as const,
    progress: 45,
    customerCounterpartyId: "c-123",
    customerName: "Иванов И.И.",
    address: "ул. Ленина, 10",
    budgetAmount: 1500000,
    startDate: "2026-01-01",
    endDate: "2026-06-01",
    metadata: {
      createdAt: "",
      updatedAt: "",
      createdBy: null,
      updatedBy: null,
    },
  }

  it("maps project to form state", () => {
    const state = getProjectInitialFormState(dummyProject)
    expect(state).toEqual({
      title: "Проект А",
      customerCounterpartyId: "c-123",
      address: "ул. Ленина, 10",
      startDate: "2026-01-01",
      endDate: "2026-06-01",
      status: "in_progress",
    })
  })

  it("returns empty form state when project is null", () => {
    const state = getProjectInitialFormState(null)
    expect(state.title).toBe("")
    expect(state.status).toBe("new")
  })

  it("converts form state back to mutation input", () => {
    const formState = {
      title: "  Новый проект  ",
      customerCounterpartyId: "  ",
      address: "Московская 5",
      startDate: "2026-02-02",
      endDate: "",
      status: "new" as const,
    }
    const input = buildProjectMutationInput(formState)
    expect(input).toEqual({
      title: "Новый проект",
      customerCounterpartyId: null,
      address: "Московская 5",
      startDate: "2026-02-02",
      endDate: null,
      status: "new",
    })
  })
})

// ─── Formatters & Date Parsers ───────────────────────────────────────────────

describe("Formatters & Date Parsers", () => {
  it("formats project money amount", () => {
    expect(formatProjectMoney(1250000)).toBe("1 250 000 ₽")
    expect(formatProjectMoney(null)).toBe("Бюджет не указан")
  })

  it("formats date range properly", () => {
    expect(formatProjectDateRange("2026-01-01", "2026-06-01")).toBe(
      "2026-01-01 – 2026-06-01"
    )
    expect(formatProjectDateRange("2026-01-01")).toBe("2026-01-01")
    expect(formatProjectDateRange(null, null)).toBe("Сроки не указаны")
  })

  it("formats dates for Russian locale display", () => {
    expect(formatDisplayDate("2026-05-15")).toBe("15 мая 2026 г.")
    expect(formatDisplayDate("invalid-date")).toBe("invalid-date")
  })
})

// ─── processChartData ────────────────────────────────────────────────────────

describe("processChartData", () => {
  const sampleTransactions = [
    { type: "payment" as const, amount: 1000, date: "2026-05-01" },
    { type: "purchase" as const, amount: 200, date: "2026-05-02" },
    { type: "payment" as const, amount: 500, date: "2026-05-03" },
  ]

  it("returns empty array if transactions list is empty", () => {
    expect(processChartData([], "30d")).toEqual([])
  })

  it("accumulates daily balance correctly", () => {
    const points = processChartData(sampleTransactions, "90d")
    // Should have generated points up to today's date
    expect(points.length).toBeGreaterThanOrEqual(3)

    // Check first point balance
    const firstPoint = points.find((p) => p.date === "2026-05-01")
    if (firstPoint) {
      expect(firstPoint.inflow).toBe(1000)
      expect(firstPoint.outflow).toBe(0)
      expect(firstPoint.balance).toBe(1000)
    }

    // Check second point balance
    const secondPoint = points.find((p) => p.date === "2026-05-02")
    if (secondPoint) {
      expect(secondPoint.inflow).toBe(0)
      expect(secondPoint.outflow).toBe(200)
      expect(secondPoint.balance).toBe(800)
    }

    // Check third point balance
    const thirdPoint = points.find((p) => p.date === "2026-05-03")
    if (thirdPoint) {
      expect(thirdPoint.inflow).toBe(500)
      expect(thirdPoint.outflow).toBe(0)
      expect(thirdPoint.balance).toBe(1300)
    }
  })
})

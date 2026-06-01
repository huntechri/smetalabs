import { describe, expect, it } from "vitest"
import {
  buildDirectoryWorkMutationInput,
  getDirectoryWorkInitialFormState,
  getDirectoryWorksListParams,
  validateDirectoryWorkFormState,
} from "./directory-works-model"

// ─── getDirectoryWorksListParams ──────────────────────────────────────────────

describe("getDirectoryWorksListParams", () => {
  function makeParams(record: Record<string, string>) {
    return { get: (key: string) => record[key] ?? null }
  }

  it("returns defaults when params are empty", () => {
    const result = getDirectoryWorksListParams(makeParams({}))
    expect(result).toEqual({
      q: undefined,
      category: undefined,
      subcategory: undefined,
      unit: undefined,
      status: "active",
      limit: 50,
      cursor: 0,
      sort: "relevance",
    })
  })

  it("parses valid values", () => {
    const result = getDirectoryWorksListParams(
      makeParams({
        q: "штукатурка",
        category: "Отделочные работы",
        subcategory: "Стены",
        unit: "м2",
        status: "archived",
        limit: "25",
        cursor: "50",
        sort: "title_asc",
      })
    )
    expect(result.q).toBe("штукатурка")
    expect(result.category).toBe("Отделочные работы")
    expect(result.status).toBe("archived")
    expect(result.limit).toBe(25)
    expect(result.cursor).toBe(50)
    expect(result.sort).toBe("title_asc")
  })

  it("ignores invalid sort", () => {
    const result = getDirectoryWorksListParams(
      makeParams({ sort: "invalid_sort" })
    )
    expect(result.sort).toBe("relevance")
  })

  it("ignores negative cursor", () => {
    const result = getDirectoryWorksListParams(
      makeParams({ cursor: "-10" })
    )
    expect(result.cursor).toBe(0)
  })
})

// ─── getDirectoryWorkInitialFormState ─────────────────────────────────────────

describe("getDirectoryWorkInitialFormState", () => {
  it("returns empty state when work is null", () => {
    const state = getDirectoryWorkInitialFormState(null)
    expect(state.title).toBe("")
    expect(state.unit).toBe("")
    expect(state.rate).toBe("")
    expect(state.category).toBe("")
  })

  it("maps work fields to form state", () => {
    const work = {
      id: "w-1",
      title: "Штукатурка стен",
      unit: "м2",
      unitCode: "m2",
      unitLabel: "м2 (m2)",
      rate: 450,
      rateAmount: 450,
      currencyCode: "RUB",
      priceKind: "base" as const,
      category: "Отделка",
      subcategory: "Стены",
      code: "WRK-001",
      description: null,
      includedOperations: null,
      excludedOperations: null,
      aliases: [],
      keywords: [],
      status: "active" as const,
      version: 1,
      metadata: {
        sourceName: null,
        sourceExternalRowKey: null,
        createdAt: "",
        updatedAt: "",
      },
    }

    const state = getDirectoryWorkInitialFormState(work)
    expect(state.title).toBe("Штукатурка стен")
    expect(state.unit).toBe("м2 (m2)")
    expect(state.rate).toBe("450")
    expect(state.category).toBe("Отделка")
    expect(state.subcategory).toBe("Стены")
  })
})

// ─── buildDirectoryWorkMutationInput ──────────────────────────────────────────

describe("buildDirectoryWorkMutationInput", () => {
  const baseState = {
    title: "  Штукатурка стен  ",
    unit: "  м2  ",
    rate: "450",
    category: "  Отделка  ",
    subcategory: "  Стены  ",
  }

  it("trims string fields", () => {
    const input = buildDirectoryWorkMutationInput(baseState)
    expect(input.title).toBe("Штукатурка стен")
    expect(input.unit).toBe("м2")
    expect(input.category).toBe("Отделка")
  })

  it("converts rate to number", () => {
    const input = buildDirectoryWorkMutationInput(baseState)
    expect(input.rate).toBe(450)
  })

  it("sets subcategory to null when empty", () => {
    const input = buildDirectoryWorkMutationInput({
      ...baseState,
      subcategory: "  ",
    })
    expect(input.subcategory).toBeNull()
  })

  it("defaults currencyCode to RUB and priceKind to base when no existing work", () => {
    const input = buildDirectoryWorkMutationInput(baseState)
    expect(input.currencyCode).toBe("RUB")
    expect(input.priceKind).toBe("base")
  })
})

// ─── validateDirectoryWorkFormState ───────────────────────────────────────────

describe("validateDirectoryWorkFormState", () => {
  const validState = {
    title: "Штукатурка",
    unit: "м2",
    rate: "450",
    category: "Отделка",
    subcategory: "",
  }

  it("returns null for valid state", () => {
    expect(validateDirectoryWorkFormState(validState)).toBeNull()
  })

  it("returns error message when title is empty", () => {
    expect(
      validateDirectoryWorkFormState({ ...validState, title: "  " })
    ).toBe("Заполните название, единицу измерения и категорию")
  })

  it("returns error message when rate is negative", () => {
    expect(
      validateDirectoryWorkFormState({ ...validState, rate: "-100" })
    ).toBe("Расценка должна быть неотрицательным числом")
  })
})

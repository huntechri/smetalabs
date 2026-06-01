import { describe, expect, it } from "vitest"
import {
  buildDirectoryMaterialMutationInput,
  getDirectoryMaterialInitialFormState,
  getDirectoryMaterialsListParams,
} from "./directory-materials-model"

// ─── getDirectoryMaterialsListParams ──────────────────────────────────────────

describe("getDirectoryMaterialsListParams", () => {
  function makeParams(record: Record<string, string>) {
    return { get: (key: string) => record[key] ?? null }
  }

  it("returns defaults when params are empty", () => {
    const result = getDirectoryMaterialsListParams(makeParams({}))
    expect(result).toEqual({
      q: undefined,
      category: undefined,
      subcategory: undefined,
      unit: undefined,
      status: "active",
      supplier: undefined,
      limit: 50,
      cursor: 0,
      sort: "relevance",
    })
  })

  it("parses valid values", () => {
    const result = getDirectoryMaterialsListParams(
      makeParams({
        q: "цемент",
        category: "Сухие смеси",
        subcategory: "Цемент",
        unit: "кг",
        status: "archived",
        supplier: "ООО Ромашка",
        limit: "25",
        cursor: "50",
        sort: "name_asc",
      })
    )
    expect(result.q).toBe("цемент")
    expect(result.category).toBe("Сухие смеси")
    expect(result.status).toBe("archived")
    expect(result.limit).toBe(25)
    expect(result.cursor).toBe(50)
    expect(result.sort).toBe("name_asc")
  })

  it("ignores invalid sort", () => {
    const result = getDirectoryMaterialsListParams(
      makeParams({ sort: "invalid_sort" })
    )
    expect(result.sort).toBe("relevance")
  })

  it("ignores negative cursor", () => {
    const result = getDirectoryMaterialsListParams(
      makeParams({ cursor: "-5" })
    )
    expect(result.cursor).toBe(0)
  })
})

// ─── getDirectoryMaterialInitialFormState ─────────────────────────────────────

describe("getDirectoryMaterialInitialFormState", () => {
  it("returns empty state when material is null", () => {
    const state = getDirectoryMaterialInitialFormState(null)
    expect(state.name).toBe("")
    expect(state.unit).toBe("")
    expect(state.price).toBe("")
    expect(state.category).toBe("")
  })

  it("maps material fields to form state", () => {
    const material = {
      id: "1",
      name: "Цемент М500",
      unit: "кг",
      unitCode: "kg",
      unitLabel: "кг (kg)",
      price: 5000,
      priceAmount: 5000,
      currencyCode: "RUB",
      category: "Сухие смеси",
      subcategory: "Цемент",
      code: "MAT-001",
      supplierName: "ООО Ромашка",
      supplierId: null,
      imageUrl: null,
      description: null,
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

    const state = getDirectoryMaterialInitialFormState(material)
    expect(state.name).toBe("Цемент М500")
    expect(state.unit).toBe("кг (kg)")
    expect(state.price).toBe("5000")
    expect(state.category).toBe("Сухие смеси")
    expect(state.subcategory).toBe("Цемент")
    expect(state.code).toBe("MAT-001")
    expect(state.supplierName).toBe("ООО Ромашка")
  })
})

// ─── buildDirectoryMaterialMutationInput ──────────────────────────────────────

describe("buildDirectoryMaterialMutationInput", () => {
  const baseState = {
    name: "  Цемент М500  ",
    unit: "  кг  ",
    price: "5000",
    category: "  Сухие смеси  ",
    subcategory: "  Цемент  ",
    code: "  MAT-001  ",
    supplierName: "  ООО Ромашка  ",
  }

  it("trims string fields", () => {
    const input = buildDirectoryMaterialMutationInput(baseState)
    expect(input.name).toBe("Цемент М500")
    expect(input.unit).toBe("кг")
    expect(input.category).toBe("Сухие смеси")
  })

  it("converts price to number", () => {
    const input = buildDirectoryMaterialMutationInput(baseState)
    expect(input.price).toBe(5000)
  })

  it("sets subcategory to null when empty", () => {
    const input = buildDirectoryMaterialMutationInput({
      ...baseState,
      subcategory: "  ",
    })
    expect(input.subcategory).toBeNull()
  })

  it("sets code to null when empty", () => {
    const input = buildDirectoryMaterialMutationInput({
      ...baseState,
      code: "",
    })
    expect(input.code).toBeNull()
  })

  it("defaults currencyCode to RUB when no existing material", () => {
    const input = buildDirectoryMaterialMutationInput(baseState)
    expect(input.currencyCode).toBe("RUB")
  })
})

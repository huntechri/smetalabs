import { describe, expect, it } from "vitest"
import {
  getCounterpartyTypeLabel,
  getLegalStatusLabel,
  getListParams,
  getNumberParam,
  getSortParam,
  getStringParam,
} from "./directory-counterparties-model"

// ─── getCounterpartyTypeLabel ────────────────────────────────────────────────

describe("getCounterpartyTypeLabel", () => {
  it("возвращает «Заказчик» для customer", () => {
    expect(getCounterpartyTypeLabel("customer")).toBe("Заказчик")
  })

  it("возвращает «Подрядчик» для contractor", () => {
    expect(getCounterpartyTypeLabel("contractor")).toBe("Подрядчик")
  })
})

// ─── getLegalStatusLabel ─────────────────────────────────────────────────────

describe("getLegalStatusLabel", () => {
  it("возвращает «Юр. лицо» для juridical", () => {
    expect(getLegalStatusLabel("juridical")).toBe("Юр. лицо")
  })

  it("возвращает «Физ. лицо» для individual", () => {
    expect(getLegalStatusLabel("individual")).toBe("Физ. лицо")
  })
})

// ─── getStringParam ──────────────────────────────────────────────────────────

describe("getStringParam", () => {
  function params(record: Record<string, string>) {
    return { get: (key: string) => record[key] ?? null }
  }

  it("возвращает значение строки", () => {
    expect(getStringParam(params({ q: "test" }), "q")).toBe("test")
  })

  it("триммирует пробелы", () => {
    expect(getStringParam(params({ q: "  hello  " }), "q")).toBe("hello")
  })

  it("возвращает undefined для пустой строки", () => {
    expect(getStringParam(params({ q: "" }), "q")).toBeUndefined()
  })

  it("возвращает undefined если ключ отсутствует", () => {
    expect(getStringParam(params({}), "q")).toBeUndefined()
  })
})

// ─── getNumberParam ──────────────────────────────────────────────────────────

describe("getNumberParam", () => {
  function params(record: Record<string, string>) {
    return { get: (key: string) => record[key] ?? null }
  }

  it("парсит корректное целое число", () => {
    expect(getNumberParam(params({ limit: "50" }), "limit")).toBe(50)
  })

  it("возвращает 0 как корректное значение", () => {
    expect(getNumberParam(params({ cursor: "0" }), "cursor")).toBe(0)
  })

  it("возвращает undefined для нечислового значения", () => {
    expect(getNumberParam(params({ limit: "abc" }), "limit")).toBeUndefined()
  })

  it("возвращает undefined для отсутствующего ключа", () => {
    expect(getNumberParam(params({}), "limit")).toBeUndefined()
  })

  it("возвращает undefined для дробного числа", () => {
    expect(getNumberParam(params({ limit: "1.5" }), "limit")).toBeUndefined()
  })
})

// ─── getSortParam ────────────────────────────────────────────────────────────

describe("getSortParam", () => {
  function params(record: Record<string, string>) {
    return { get: (key: string) => record[key] ?? null }
  }

  it("возвращает relevance", () => {
    expect(getSortParam(params({ sort: "relevance" }))).toBe("relevance")
  })

  it("возвращает updated_desc", () => {
    expect(getSortParam(params({ sort: "updated_desc" }))).toBe("updated_desc")
  })

  it("возвращает name_asc", () => {
    expect(getSortParam(params({ sort: "name_asc" }))).toBe("name_asc")
  })

  it("возвращает undefined для неизвестного значения", () => {
    expect(getSortParam(params({ sort: "unknown" }))).toBeUndefined()
  })

  it("возвращает undefined если параметр отсутствует", () => {
    expect(getSortParam(params({}))).toBeUndefined()
  })
})

// ─── getListParams ───────────────────────────────────────────────────────────

describe("getListParams", () => {
  function params(record: Record<string, string>) {
    return { get: (key: string) => record[key] ?? null }
  }

  it("возвращает дефолтные значения при пустых параметрах", () => {
    const result = getListParams(params({}))
    expect(result).toEqual({
      q: undefined,
      status: "active",
      limit: 50,
      cursor: 0,
      sort: "relevance",
    })
  })

  it("парсит status=archived", () => {
    expect(getListParams(params({ status: "archived" })).status).toBe(
      "archived"
    )
  })

  it("возвращает active для любого другого значения status", () => {
    expect(getListParams(params({ status: "unknown" })).status).toBe("active")
  })

  it("корректно парсит все параметры", () => {
    const result = getListParams(
      params({ q: "ООО", status: "active", limit: "25", cursor: "25", sort: "name_asc" })
    )
    expect(result).toEqual({
      q: "ООО",
      status: "active",
      limit: 25,
      cursor: 25,
      sort: "name_asc",
    })
  })
})

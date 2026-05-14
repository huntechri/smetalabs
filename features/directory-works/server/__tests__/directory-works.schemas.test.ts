import { describe, expect, it } from "vitest"
import { ZodError } from "zod"
import {
  parseDirectoryWorkAiSearchBody,
  parseDirectoryWorkEmbeddingProcessBody,
  parseDirectoryWorkId,
  parseDirectoryWorkImportCreateBody,
  parseDirectoryWorkMutationBody,
  parseDirectoryWorksExportParams,
  parseDirectoryWorksListParams,
} from "../directory-works.schemas"

describe("directory works schemas", () => {
  it("normalizes list params and applies safe defaults", () => {
    const params = parseDirectoryWorksListParams(
      new URLSearchParams({
        q: "  монтаж   стен  ",
        status: "active",
        limit: "25",
        cursor: "10",
      })
    )

    expect(params).toMatchObject({
      q: "монтаж стен",
      status: "active",
      limit: 25,
      cursor: 10,
      sort: "relevance",
    })
  })

  it("validates and normalizes mutation payloads", () => {
    const input = parseDirectoryWorkMutationBody({
      title: "  Штукатурка   стен  ",
      unit: " м2 ",
      rate: "1500",
      category: " Отделка ",
      subcategory: " ",
      code: null,
      description: "  базовая   работа ",
      includedOperations: " подготовка ",
      excludedOperations: null,
      sourceName: " прайс ",
      sourceExternalRowKey: " row-1 ",
      currencyCode: "rub",
      priceKind: "labor",
    })

    expect(input).toMatchObject({
      title: "Штукатурка стен",
      unit: "м2",
      rate: 1500,
      category: "Отделка",
      subcategory: null,
      description: "базовая работа",
      currencyCode: "RUB",
      priceKind: "labor",
    })
  })

  it("rejects invalid mutation payloads", () => {
    expect(() =>
      parseDirectoryWorkMutationBody({
        title: "",
        unit: "м2",
        rate: -1,
        category: "Отделка",
      })
    ).toThrow(ZodError)
  })

  it("enforces import, AI search, embedding, export, and id boundaries", () => {
    expect(
      parseDirectoryWorkImportCreateBody({
        rows: [{ title: "Работа", unit: "м2", rate: 100 }],
        fileName: " works.csv ",
        fileMimeType: " text/csv ",
        fileSizeBytes: "42",
        sourceName: " импорт ",
      })
    ).toMatchObject({
      fileName: "works.csv",
      fileMimeType: "text/csv",
      fileSizeBytes: 42,
      rows: [{ title: "Работа", unit: "м2", rate: 100 }],
      sourceName: "импорт",
    })

    expect(
      parseDirectoryWorkAiSearchBody({
        query: "  найти   работу  ",
        limit: "5",
      })
    ).toMatchObject({ query: "найти работу", limit: 5, threshold: 0.72 })

    expect(parseDirectoryWorkEmbeddingProcessBody({ limit: "7" })).toEqual({
      limit: 7,
    })

    expect(
      parseDirectoryWorksExportParams(
        new URLSearchParams({ format: "xlsx", status: "archived" })
      )
    ).toMatchObject({ format: "xlsx", params: { status: "archived" } })

    expect(parseDirectoryWorkId("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "550e8400-e29b-41d4-a716-446655440000"
    )
    expect(() => parseDirectoryWorkId("not-a-uuid")).toThrow(ZodError)
  })
})

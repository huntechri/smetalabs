import { afterEach, describe, expect, it, vi } from "vitest"
import {
  archiveDirectoryWork,
  buildDirectoryWorksExportHref,
  createDirectoryWork,
  fetchDirectoryWorks,
  processDirectoryWorkEmbeddings,
} from "../directory-works-client"

const mutationInput = {
  title: "Работа",
  unit: "м2",
  rate: 100,
  category: "Категория",
  subcategory: null,
  code: null,
  description: null,
  includedOperations: null,
  excludedOperations: null,
  sourceName: null,
  sourceExternalRowKey: null,
  currencyCode: "RUB",
  priceKind: "base",
} as const

describe("directory works client", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sends list params with credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [], meta: { total: 0 } }), {
        status: 200,
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await fetchDirectoryWorks({ q: "стены", limit: 20, status: "active" })

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/directory-works?q=%D1%81%D1%82%D0%B5%D0%BD%D1%8B&status=active&limit=20",
      { credentials: "include", headers: undefined }
    )
  })

  it("sends mutation and processing requests with JSON bodies", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: { id: "work-1" } }), {
          status: 200,
        })
      )
    )
    vi.stubGlobal("fetch", fetchMock)

    await createDirectoryWork(mutationInput)
    await archiveDirectoryWork("work-1")
    await processDirectoryWorkEmbeddings(3)

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/directory-works", {
      credentials: "include",
      method: "POST",
      body: JSON.stringify(mutationInput),
      headers: { "Content-Type": "application/json" },
    })
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/directory-works/work-1",
      {
        credentials: "include",
        method: "DELETE",
        headers: undefined,
      }
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/directory-works/embeddings/process",
      {
        credentials: "include",
        method: "POST",
        body: JSON.stringify({ limit: 3 }),
        headers: { "Content-Type": "application/json" },
      }
    )
  })

  it("builds export hrefs without pagination params", () => {
    expect(
      buildDirectoryWorksExportHref("csv", {
        q: "пол",
        status: "active",
        limit: 50,
        cursor: 100,
      })
    ).toBe(
      "/api/directory-works/export?q=%D0%BF%D0%BE%D0%BB&status=active&format=csv"
    )
  })

  it("builds full export href when no view params are passed", () => {
    expect(buildDirectoryWorksExportHref("xlsx")).toBe(
      "/api/directory-works/export?status=active&format=xlsx"
    )
  })
})

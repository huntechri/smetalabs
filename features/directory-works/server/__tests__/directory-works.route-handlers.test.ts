import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { DirectoryWorksApiError } from "../../api/directory-works-errors"

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  archive: vi.fn(),
  createImport: vi.fn(),
  applyImport: vi.fn(),
  exportWorks: vi.fn(),
  aiSearch: vi.fn(),
  processEmbeddings: vi.fn(),
}))

vi.mock("../directory-works.service", () => ({
  listDirectoryWorks: mocks.list,
  createDirectoryWork: mocks.create,
  archiveDirectoryWork: mocks.archive,
  createDirectoryWorkImportJob: mocks.createImport,
  applyDirectoryWorkImportJob: mocks.applyImport,
  exportDirectoryWorks: mocks.exportWorks,
  aiSearchDirectoryWorks: mocks.aiSearch,
  processDirectoryWorkEmbeddings: mocks.processEmbeddings,
  getDirectoryWork: vi.fn(),
  getDirectoryWorkImportJob: vi.fn(),
  getDirectoryWorksCategories: vi.fn(),
  updateDirectoryWork: vi.fn(),
}))

const handlers = await import("../directory-works.route-handlers")

function request(
  url: string,
  init?: { method?: string; body?: string; headers?: HeadersInit }
) {
  return new NextRequest(url, init)
}

const validBody = {
  title: "Монтаж",
  unit: "м2",
  rate: 100,
  category: "Работы",
  currencyCode: "RUB",
  priceKind: "base",
}

describe("directory works route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.list.mockResolvedValue({ data: [], meta: { total: 0 } })
    mocks.create.mockResolvedValue({
      data: { id: "11111111-1111-4111-8111-111111111111" },
    })
    mocks.archive.mockResolvedValue({
      data: { id: "11111111-1111-4111-8111-111111111111", status: "archived" },
    })
    mocks.createImport.mockResolvedValue({
      data: { job: { id: "22222222-2222-4222-8222-222222222222" } },
    })
    mocks.applyImport.mockResolvedValue({
      data: { job: { id: "22222222-2222-4222-8222-222222222222" } },
    })
    mocks.exportWorks.mockResolvedValue({
      body: "id,title\nwork-1,Монтаж\n",
      extension: "csv",
      contentType: "text/csv; charset=utf-8",
    })
    mocks.aiSearch.mockResolvedValue({ data: [], meta: { total: 0 } })
    mocks.processEmbeddings.mockResolvedValue({
      data: { processed: 0, failed: 0 },
    })
  })

  it("validates list params and returns stable JSON errors", async () => {
    const response = await handlers.handleDirectoryWorksListRequest(
      request("https://app.test/api/directory-works?limit=-1")
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe("BAD_REQUEST")
    expect(mocks.list).not.toHaveBeenCalled()
  })

  it("validates mutation bodies before create service calls", async () => {
    const response = await handlers.handleDirectoryWorkCreateRequest(
      request("https://app.test/api/directory-works", {
        method: "POST",
        body: JSON.stringify({ title: "" }),
      })
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      error: { code: "BAD_REQUEST" },
    })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it("creates with parsed server body and status 201", async () => {
    const response = await handlers.handleDirectoryWorkCreateRequest(
      request("https://app.test/api/directory-works", {
        method: "POST",
        body: JSON.stringify(validBody),
      })
    )

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Монтаж", unit: "м2", rate: 100 })
    )
  })

  it("archives by ID and does not expect physical delete", async () => {
    const response = await handlers.handleDirectoryWorkArchiveRequest(
      "11111111-1111-4111-8111-111111111111"
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.archive).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111"
    )
    expect(body.data.status).toBe("archived")
  })

  it("maps service auth and permission errors without changing contracts", async () => {
    mocks.archive.mockRejectedValueOnce(
      new DirectoryWorksApiError("FORBIDDEN", "Недостаточно прав", 403)
    )

    const response = await handlers.handleDirectoryWorkArchiveRequest(
      "11111111-1111-4111-8111-111111111111"
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: { code: "FORBIDDEN", message: "Недостаточно прав" },
    })
  })

  it("validates and creates import jobs", async () => {
    const response = await handlers.handleDirectoryWorkImportCreateRequest(
      request("https://app.test/api/directory-works/import-jobs", {
        method: "POST",
        body: JSON.stringify({
          fileName: "works.csv",
          rows: [validBody],
        }),
      })
    )

    expect(response.status).toBe(201)
    expect(mocks.createImport).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: "works.csv" })
    )
  })

  it("rejects oversized import files before service calls", async () => {
    const response = await handlers.handleDirectoryWorkImportCreateRequest(
      request("https://app.test/api/directory-works/import-jobs", {
        method: "POST",
        body: JSON.stringify({
          fileName: "works.csv",
          fileSizeBytes: 51 * 1024 * 1024,
          rows: [validBody],
        }),
      })
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toMatchObject({
      code: "BAD_REQUEST",
      message: "Размер файла не должен превышать 50 МБ",
    })
    expect(mocks.createImport).not.toHaveBeenCalled()
  })

  it("returns readable import create failures", async () => {
    mocks.createImport.mockRejectedValueOnce(
      new DirectoryWorksApiError(
        "IMPORT_JOB_CREATE_FAILED",
        "Не удалось создать импорт. Проверьте файл и попробуйте снова.",
        400
      )
    )

    const response = await handlers.handleDirectoryWorkImportCreateRequest(
      request("https://app.test/api/directory-works/import-jobs", {
        method: "POST",
        body: JSON.stringify({
          fileName: "works.csv",
          rows: [validBody],
        }),
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "IMPORT_JOB_CREATE_FAILED",
        message: "Не удалось создать импорт. Проверьте файл и попробуйте снова.",
      },
    })
  })

  it("applies import jobs and returns service response", async () => {
    const response = await handlers.handleDirectoryWorkImportApplyRequest(
      "22222222-2222-4222-8222-222222222222"
    )

    expect(response.status).toBe(200)
    expect(mocks.applyImport).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222"
    )
  })

  it("returns export content headers", async () => {
    const response = await handlers.handleDirectoryWorksExportRequest(
      request("https://app.test/api/directory-works/export?format=csv")
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8")
    expect(response.headers.get("Content-Disposition")).toMatch(
      /directory-works-\d{4}-\d{2}-\d{2}\.csv/
    )
    await expect(response.text()).resolves.toContain("work-1")
  })

  it("validates AI search input", async () => {
    const response = await handlers.handleDirectoryWorksAiSearchRequest(
      request("https://app.test/api/directory-works/ai-search", {
        method: "POST",
        body: JSON.stringify({ query: "" }),
      })
    )

    expect(response.status).toBe(400)
    expect(mocks.aiSearch).not.toHaveBeenCalled()
  })

  it("validates embedding process input", async () => {
    const response = await handlers.handleDirectoryWorkEmbeddingsProcessRequest(
      request("https://app.test/api/directory-works/embeddings/process", {
        method: "POST",
        body: JSON.stringify({ limit: 10 }),
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.processEmbeddings).toHaveBeenCalledWith(10)
  })
})
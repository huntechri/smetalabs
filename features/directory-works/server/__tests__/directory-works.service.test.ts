import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  requireCurrentWorkspace: vi.fn(),
  getWorkspaceRole: vi.fn(),
  revalidateTag: vi.fn(),
  unstableCache: vi.fn((fn: () => unknown) => fn),
  createRepository: vi.fn(),
  updateRepository: vi.fn(),
  archiveRepository: vi.fn(),
  getRepository: vi.fn(),
  listRepository: vi.fn(),
  categoriesRepository: vi.fn(),
  createImportRepository: vi.fn(),
  getImportRepository: vi.fn(),
  applyImportRepository: vi.fn(),
  enqueueEmbedding: vi.fn(),
  enqueueEmbeddings: vi.fn(),
  processQueue: vi.fn(),
  aiSearchRepository: vi.fn(),
  getExportRepository: vi.fn(),
  buildExportFile: vi.fn(),
  measure: vi.fn((_label: string, _tags: unknown, fn: () => unknown) => fn()),
}))

vi.mock("next/cache", () => ({
  revalidateTag: mocks.revalidateTag,
  unstable_cache: mocks.unstableCache,
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser } })),
}))

vi.mock("@/lib/auth/team", () => ({
  requireCurrentWorkspace: mocks.requireCurrentWorkspace,
  getWorkspaceRole: mocks.getWorkspaceRole,
}))

vi.mock("../directory-works.repository", () => ({
  createDirectoryWorkForWorkspace: mocks.createRepository,
  updateDirectoryWorkForWorkspace: mocks.updateRepository,
  archiveDirectoryWorkForWorkspace: mocks.archiveRepository,
  getDirectoryWorkForWorkspace: mocks.getRepository,
  listDirectoryWorksForWorkspace: mocks.listRepository,
  getDirectoryWorkCategoriesForWorkspace: mocks.categoriesRepository,
}))

vi.mock("../directory-works-import.repository", () => ({
  createDirectoryWorkImportJobForWorkspace: mocks.createImportRepository,
  getDirectoryWorkImportJobForWorkspace: mocks.getImportRepository,
  applyDirectoryWorkImportJobForWorkspace: mocks.applyImportRepository,
}))

vi.mock("../directory-works-large-import.repository", () => ({
  appendDirectoryWorkImportBatchForWorkspace: vi.fn(),
  applyDirectoryWorkImportBatchForWorkspace: vi.fn(),
  createChunkedDirectoryWorkImportJobForWorkspace: vi.fn(),
  getChunkedDirectoryWorkImportJobForWorkspace: vi.fn(async () => null),
}))

vi.mock("../directory-works.embeddings", () => ({
  enqueueDirectoryWorkEmbedding: mocks.enqueueEmbedding,
  enqueueDirectoryWorkEmbeddings: mocks.enqueueEmbeddings,
  processDirectoryWorkEmbeddingQueue: mocks.processQueue,
  aiSearchDirectoryWorksForWorkspace: mocks.aiSearchRepository,
}))

vi.mock("../directory-works.export", () => ({
  getDirectoryWorksForExport: mocks.getExportRepository,
  buildDirectoryWorksExportFile: mocks.buildExportFile,
}))

vi.mock("../directory-works.observability", () => ({
  measureDirectoryWorksOperation: mocks.measure,
}))

const service = await import("../directory-works.service")

const mutationInput = {
  title: "Монтаж",
  unit: "м2",
  rate: 100,
  category: "Работы",
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

describe("directory works service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    })
    mocks.requireCurrentWorkspace.mockResolvedValue("owner-1")
    mocks.getWorkspaceRole.mockResolvedValue("manager")
    mocks.createRepository.mockResolvedValue({ id: "work-1", title: "Монтаж" })
    mocks.updateRepository.mockResolvedValue({
      id: "work-1",
      title: "Монтаж 2",
    })
    mocks.archiveRepository.mockResolvedValue({
      id: "work-1",
      title: "Монтаж",
      status: "archived",
    })
    mocks.getRepository.mockResolvedValue({ id: "work-1", title: "Монтаж" })
    mocks.applyImportRepository.mockResolvedValue({
      data: { job: { id: "job-1" } },
    })
    mocks.getImportRepository.mockResolvedValue({
      data: { job: { id: "job-1" } },
      rows: [{ appliedWorkId: "work-1" }, { appliedWorkId: null }],
    })
    mocks.processQueue.mockResolvedValue({ data: { processed: 1, failed: 0 } })
  })

  it("requires authenticated read context", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(
      service.listDirectoryWorks({ limit: 20 })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    })
  })

  it("maps missing workspace membership to forbidden read context", async () => {
    mocks.requireCurrentWorkspace.mockRejectedValue(
      new Error("WORKSPACE_MEMBER_REQUIRED")
    )

    await expect(service.getDirectoryWork("work-1")).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    })
  })

  it("rejects viewer writes before repository calls", async () => {
    mocks.getWorkspaceRole.mockResolvedValue("viewer")

    await expect(
      service.createDirectoryWork(mutationInput)
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    })
    expect(mocks.createRepository).not.toHaveBeenCalled()
  })

  it("resolves workspace server-side, creates work, enqueues embedding, and revalidates cache", async () => {
    await expect(service.createDirectoryWork(mutationInput)).resolves.toEqual({
      data: { id: "work-1", title: "Монтаж" },
    })

    expect(mocks.createRepository).toHaveBeenCalledWith(
      "owner-1",
      "user-1",
      mutationInput
    )
    expect(mocks.enqueueEmbedding).toHaveBeenCalledWith("owner-1", {
      id: "work-1",
      title: "Монтаж",
    })
    expect(mocks.revalidateTag).toHaveBeenCalledWith(
      "directory-works:owner-1",
      "max"
    )
    expect(mocks.revalidateTag).toHaveBeenCalledWith(
      "directory-work:owner-1:work-1",
      "max"
    )
  })

  it("updates and archives through workspace-scoped repository methods", async () => {
    await service.updateDirectoryWork("work-1", mutationInput)
    await service.archiveDirectoryWork("work-1")

    expect(mocks.updateRepository).toHaveBeenCalledWith(
      "owner-1",
      "user-1",
      "work-1",
      mutationInput
    )
    expect(mocks.archiveRepository).toHaveBeenCalledWith(
      "owner-1",
      "user-1",
      "work-1"
    )
  })

  it("applies import jobs and enqueues embeddings for applied rows", async () => {
    await service.applyDirectoryWorkImportJob("job-1")

    expect(mocks.applyImportRepository).toHaveBeenCalledWith(
      "owner-1",
      "user-1",
      "job-1"
    )
    expect(mocks.getRepository).toHaveBeenCalledWith("owner-1", "work-1")
    expect(mocks.enqueueEmbeddings).toHaveBeenCalledWith("owner-1", [
      { id: "work-1", title: "Монтаж" },
    ])
    expect(mocks.revalidateTag).toHaveBeenCalledWith(
      "directory-works-import:owner-1:job-1",
      "max"
    )
  })

  it("requires write context when processing embeddings and revalidates AI search index", async () => {
    await expect(service.processDirectoryWorkEmbeddings(5)).resolves.toEqual({
      data: { processed: 1, failed: 0 },
    })

    expect(mocks.processQueue).toHaveBeenCalledWith("owner-1", 5)
    expect(mocks.revalidateTag).toHaveBeenCalledWith(
      "directory-works-ai:owner-1:index",
      "max"
    )
  })
})

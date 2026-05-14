type DirectoryWorksOperation =
  | "list"
  | "detail"
  | "categories"
  | "create"
  | "update"
  | "archive"
  | "import.create"
  | "import.detail"
  | "import.apply"
  | "export"
  | "ai.search"
  | "embeddings.process"

export type DirectoryWorksMetricContext = {
  workspaceOwnerId?: string
  workId?: string
  jobId?: string
  rows?: number
  limit?: number
  hasQuery?: boolean
  format?: string
  cache?: "hit" | "miss" | "bypass"
  errorCode?: string
}

const DEFAULT_SLOW_OPERATION_MS = 750
const MUTATION_SLOW_OPERATION_MS = 1500
const BULK_SLOW_OPERATION_MS = 3000

const OPERATION_SLOW_THRESHOLDS_MS: Partial<
  Record<DirectoryWorksOperation, number>
> = {
  create: MUTATION_SLOW_OPERATION_MS,
  update: MUTATION_SLOW_OPERATION_MS,
  archive: MUTATION_SLOW_OPERATION_MS,
  "import.create": MUTATION_SLOW_OPERATION_MS,
  "import.apply": BULK_SLOW_OPERATION_MS,
  export: BULK_SLOW_OPERATION_MS,
  "ai.search": MUTATION_SLOW_OPERATION_MS,
  "embeddings.process": BULK_SLOW_OPERATION_MS,
}

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now()
}

function sanitizeContext(context: DirectoryWorksMetricContext) {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined && value !== null)
  )
}

function getSlowOperationThresholdMs(operation: DirectoryWorksOperation) {
  return OPERATION_SLOW_THRESHOLDS_MS[operation] ?? DEFAULT_SLOW_OPERATION_MS
}

export function recordDirectoryWorksMetric(
  operation: DirectoryWorksOperation,
  durationMs: number,
  context: DirectoryWorksMetricContext = {}
) {
  const slowThresholdMs = getSlowOperationThresholdMs(operation)
  const payload = {
    subsystem: "directory-works",
    operation,
    durationMs: Math.round(durationMs),
    slowThresholdMs,
    ...sanitizeContext(context),
  }

  if (durationMs >= slowThresholdMs) {
    console.warn("[directory-works:slow-path]", payload)
    return
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[directory-works:metric]", payload)
  }
}

export async function measureDirectoryWorksOperation<T>(
  operation: DirectoryWorksOperation,
  context: DirectoryWorksMetricContext,
  callback: () => Promise<T>
): Promise<T> {
  const start = now()

  try {
    const result = await callback()
    recordDirectoryWorksMetric(operation, now() - start, context)
    return result
  } catch (err) {
    recordDirectoryWorksMetric(operation, now() - start, {
      ...context,
      errorCode:
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: unknown }).code)
          : err instanceof Error
            ? err.name
            : "unknown",
    })
    throw err
  }
}

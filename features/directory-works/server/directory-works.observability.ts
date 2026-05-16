type DirectoryWorksOperation =
  | "list"
  | "detail"
  | "categories"
  | "create"
  | "update"
  | "archive"
  | "import.create"
  | "import.detail"
  | "import.batch"
  | "import.apply"
  | "import.apply.batch"
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

const SLOW_OPERATION_MS = 500

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now()
}

function sanitizeContext(context: DirectoryWorksMetricContext) {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined && value !== null)
  )
}

export function recordDirectoryWorksMetric(
  operation: DirectoryWorksOperation,
  durationMs: number,
  context: DirectoryWorksMetricContext = {}
) {
  const payload = {
    subsystem: "directory-works",
    operation,
    durationMs: Math.round(durationMs),
    slowThresholdMs: SLOW_OPERATION_MS,
    ...sanitizeContext(context),
  }

  if (durationMs >= SLOW_OPERATION_MS) {
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

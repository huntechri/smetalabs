import { Suspense } from "react"
import { ExecutionView } from "@/features/execution/components/execution-view"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"

function ExecutionSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-gray-400 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[minmax(320px,1fr)_minmax(560px,0.9fr)]"
        >
          <div className="rounded-md border border-border p-2">
            <Skeleton className="mb-1 h-3 w-20" />
            <Skeleton className="mb-1 h-4 w-full max-w-md" />
            <Skeleton className="h-3 w-8" />
          </div>
          <div className="grid gap-1.5 md:grid-cols-[minmax(190px,1fr)_minmax(190px,1fr)_minmax(80px,0.4fr)]">
            <Skeleton className="h-16 rounded-md" />
            <Skeleton className="h-16 rounded-md" />
            <Skeleton className="h-16 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}

type EstimateExecutionPageProps = {
  params: Promise<{ projectId: string; estimateId: string }>
}

export default async function EstimateExecutionPage({
  params,
}: EstimateExecutionPageProps) {
  const { projectId, estimateId } = await params

  return (
    <Suspense fallback={<ExecutionSkeleton />}>
      <div className="flex min-h-0 flex-1 flex-col">
        <ExecutionView estimateId={estimateId} projectId={projectId} />
      </div>
    </Suspense>
  )
}

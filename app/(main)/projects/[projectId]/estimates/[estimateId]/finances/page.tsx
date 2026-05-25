import { Suspense } from "react"
import { FinancesView } from "@/features/finances/components/finances-view"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"

function FinancesSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-1">
      {/* KPI skeleton */}
      <div className="grid grid-cols-2 gap-4 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-7 w-28" />
            {i === 3 && <Skeleton className="mt-3 h-2 w-full" />}
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid gap-3 rounded-md border border-border p-3"
          >
            <div className="flex items-center gap-2">
              <Skeleton className="size-4" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

type EstimateFinancesPageProps = {
  params: Promise<{ projectId: string; estimateId: string }>
}

export default async function EstimateFinancesPage({
  params,
}: EstimateFinancesPageProps) {
  const { projectId, estimateId } = await params

  return (
    <Suspense fallback={<FinancesSkeleton />}>
      <div className="flex-1 min-h-0 flex flex-col">
        <FinancesView estimateId={estimateId} projectId={projectId} />
      </div>
    </Suspense>
  )
}

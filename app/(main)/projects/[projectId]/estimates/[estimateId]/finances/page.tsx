import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { FinancesView } from "@/features/finances/components/finances-view"

function FinancesSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-1">
      {/* KPI skeleton */}
      <div className="grid grid-cols-2 gap-4 @5xl/main:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>

      {/* Table skeleton — repeats real table structure: 5 cols */}
      <div className="rounded-lg border border-dashed border-border">
        <div className="flex items-center gap-4 border-b border-border px-4 py-3">
          <Skeleton className="h-3 w-[40%]" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-8" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
          >
            <div className="flex items-center gap-2 w-[40%]">
              <Skeleton className="size-4 shrink-0" />
              <Skeleton className="h-4 flex-1 max-w-64" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-8" />
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

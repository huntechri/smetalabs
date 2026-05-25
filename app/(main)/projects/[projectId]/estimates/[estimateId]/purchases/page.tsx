import { Suspense } from "react"
import { PurchasesView } from "@/features/purchases/components/purchases-view"
import { Skeleton } from "@/components/ui/skeleton"

export const dynamic = "force-dynamic"

function PurchasesSkeleton() {
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

type EstimatePurchasesPageProps = {
  params: Promise<{ projectId: string; estimateId: string }>
}

export default async function EstimatePurchasesPage({
  params,
}: EstimatePurchasesPageProps) {
  const { projectId, estimateId } = await params

  return (
    <Suspense fallback={<PurchasesSkeleton />}>
      <PurchasesView estimateId={estimateId} projectId={projectId} />
    </Suspense>
  )
}

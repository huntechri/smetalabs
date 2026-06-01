import { ChartAreaInteractive } from "@/features/projects/ui/chart-area-interactive"
import { EstimatesTable } from "@/features/projects/ui/estimates-table"
import { SectionCards } from "@/features/projects/ui/section-cards"

export const dynamic = "force-dynamic"

type ProjectDetailsPageProps = {
  params: Promise<{ projectId: string }>
}

export default async function ProjectDetailsPage({
  params,
}: ProjectDetailsPageProps) {
  const { projectId } = await params

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="@container/main flex min-h-0 flex-1 flex-col gap-2">
        <div className="scrollbar-subtle flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-4 md:gap-6 md:py-6">
          <SectionCards projectId={projectId} />
          <div className="px-4 lg:px-6">
            <ChartAreaInteractive projectId={projectId} />
          </div>
          <EstimatesTable projectId={projectId} />
        </div>
      </div>
    </div>
  )
}

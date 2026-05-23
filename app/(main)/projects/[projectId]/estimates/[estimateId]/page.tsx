import { EstimateEditorView } from "@/features/estimates/estimate-details/components/estimate-editor-view"

export const dynamic = "force-dynamic"

type EstimateDetailsPageProps = {
  params: Promise<{ projectId: string; estimateId: string }>
}

export default async function EstimateDetailsPage({
  params,
}: EstimateDetailsPageProps) {
  const { projectId, estimateId } = await params

  return <EstimateEditorView projectId={projectId} recordId={estimateId} />
}

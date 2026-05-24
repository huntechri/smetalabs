import { PurchasesView } from "@/features/purchases/components/purchases-view"

export const dynamic = "force-dynamic"

type EstimatePurchasesPageProps = {
  params: Promise<{ projectId: string; estimateId: string }>
}

export default async function EstimatePurchasesPage({
  params,
}: EstimatePurchasesPageProps) {
  const { projectId, estimateId } = await params

  return <PurchasesView estimateId={estimateId} projectId={projectId} />
}

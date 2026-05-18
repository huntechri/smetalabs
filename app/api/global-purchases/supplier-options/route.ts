import { handleGlobalPurchaseSupplierOptionsRequest } from "@/features/global-purchases/server/global-purchases.route-handlers"

export const dynamic = "force-dynamic"

export async function GET() {
  return handleGlobalPurchaseSupplierOptionsRequest()
}

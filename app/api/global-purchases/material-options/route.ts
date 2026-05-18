import { NextRequest } from "next/server"
import { handleGlobalPurchaseMaterialOptionsRequest } from "@/features/global-purchases/server/global-purchases.route-handlers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return handleGlobalPurchaseMaterialOptionsRequest(request)
}

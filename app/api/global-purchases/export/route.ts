import { NextRequest } from "next/server"
import { handleGlobalPurchasesExportRequest } from "@/features/global-purchases/server/global-purchases.route-handlers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return handleGlobalPurchasesExportRequest(request)
}

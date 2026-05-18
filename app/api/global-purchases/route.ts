import { NextRequest } from "next/server"
import {
  handleGlobalPurchaseCreateRequest,
  handleGlobalPurchasesListRequest,
} from "@/features/global-purchases/server/global-purchases.route-handlers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return handleGlobalPurchasesListRequest(request)
}

export async function POST(request: NextRequest) {
  return handleGlobalPurchaseCreateRequest(request)
}

import { NextRequest } from "next/server"
import {
  handleDirectoryCounterpartiesListRequest,
  handleDirectoryCounterpartyCreateRequest,
} from "@/features/directory-counterparties/server/directory-counterparties.route-handlers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return handleDirectoryCounterpartiesListRequest(request)
}

export async function POST(request: NextRequest) {
  return handleDirectoryCounterpartyCreateRequest(request)
}

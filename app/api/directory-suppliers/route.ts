import { NextRequest } from "next/server"
import {
  handleDirectorySupplierCreateRequest,
  handleDirectorySuppliersListRequest,
} from "@/features/directory-suppliers/server/directory-suppliers.route-handlers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return handleDirectorySuppliersListRequest(request)
}

export async function POST(request: NextRequest) {
  return handleDirectorySupplierCreateRequest(request)
}

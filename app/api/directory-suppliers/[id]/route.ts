import { NextRequest } from "next/server"
import {
  handleDirectorySupplierArchiveRequest,
  handleDirectorySupplierDetailRequest,
  handleDirectorySupplierUpdateRequest,
} from "@/features/directory-suppliers/server/directory-suppliers.route-handlers"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleDirectorySupplierDetailRequest(id)
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  return handleDirectorySupplierUpdateRequest(request, id)
}

async function archiveSupplier(
  _request: NextRequest,
  { params }: RouteContext
) {
  const { id } = await params
  return handleDirectorySupplierArchiveRequest(id)
}

export { archiveSupplier as DELETE }

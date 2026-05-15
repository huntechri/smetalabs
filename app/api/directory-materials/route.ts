import { NextRequest } from "next/server"
import {
  handleDirectoryMaterialCreateRequest,
  handleDirectoryMaterialsListRequest,
} from "@/features/directory-materials/server/directory-materials.route-handlers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return handleDirectoryMaterialsListRequest(request)
}

export async function POST(request: NextRequest) {
  return handleDirectoryMaterialCreateRequest(request)
}

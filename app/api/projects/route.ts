import { NextRequest } from "next/server"
import {
  handleProjectCreateRequest,
  handleProjectsListRequest,
} from "@/features/projects/server/projects.route-handlers"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return handleProjectsListRequest(request)
}

export async function POST(request: NextRequest) {
  return handleProjectCreateRequest(request)
}

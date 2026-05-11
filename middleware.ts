import { NextResponse, type NextRequest } from "next/server"
import { createMiddlewareClient } from "@/lib/supabase/middleware"

/**
 * Protected route patterns — requires authentication.
 */
const protectedRoutes = [
  "/dashboard",
  "/projects",
  "/directories",
  "/team",
  "/templates",
  "/procurements",
  "/admin",
  "/settings",
]

/**
 * Public route patterns — accessible without authentication.
 */
const publicRoutes = ["/auth", "/api", "/"]

/**
 * Middleware entry point.
 * Checks authentication for protected routes and redirects to login if needed.
 */
export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Allow public routes
  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )

  // Allow API routes (they handle their own auth)
  const isApiRoute = pathname.startsWith("/api/")

  if (isApiRoute) {
    return response
  }

  // Allow public routes and root
  if (isPublic) {
    return response
  }

  // Check if the route is protected
  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )

  if (isProtected && !user) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If user is authenticated but on an auth page, redirect to dashboard
  if (pathname.startsWith("/auth") && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     * - .well-known (health checks, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

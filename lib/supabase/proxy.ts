import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const { data } = await supabase.auth.getClaims()

  const user = data?.claims
  const { pathname } = request.nextUrl

  // ── Auth callback — always allow (OAuth / email confirm) ──
  if (pathname.startsWith("/auth/callback")) {
    return supabaseResponse
  }

  // ── Auth pages (/login, /signup, /forgot-password) — only for unauthenticated ──
  const authPaths = ["/login", "/signup", "/forgot-password"]
  const isAuthPage = authPaths.some((p) => pathname === p)

  if (isAuthPage) {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = "/dashboard"
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ── Admin routes — only admin/owner ──
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // ── API routes — handle their own auth (no middleware redirect) ──
  if (pathname.startsWith("/api/")) {
    return supabaseResponse
  }

  // ── Protected routes — require authentication ──
  // Home page (/) and auth pages are public
  const publicPaths = ["/", "/auth"]
  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

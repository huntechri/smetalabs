import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Middleware для защиты роутов и обновления сессий.
 *
 * Использует @supabase/ssr для работы с cookies.
 *
 * Защищённые роуты: /dashboard, /projects, /directories, /team,
 *   /templates, /procurements, /admin, /settings
 *
 * Публичные роуты: /auth, /api, /
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Обновляем сессию (продлевает токен в cookies)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Проверяем, защищён ли текущий роут
  const { pathname } = request.nextUrl

  const isProtectedPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/directories') ||
    pathname.startsWith('/team') ||
    pathname.startsWith('/templates') ||
    pathname.startsWith('/procurements') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/settings')

  const isPublicPath =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname === '/'

  // Если защищённый роут и нет пользователя — редирект на логин
  if (isProtectedPath && !user) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Если публичный роут /auth/login и пользователь уже залогинен — редирект на дашборд
  if (
    user &&
    (pathname.startsWith('/auth/login') ||
      pathname.startsWith('/auth/signup') ||
      pathname.startsWith('/auth/forgot-password'))
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
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
     * - public files (robots.txt, sitemap.xml, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

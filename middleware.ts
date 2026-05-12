import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Create Supabase client for middleware
  let supabaseResponse = NextResponse.next({
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
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if not authenticated
  if (!user && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect to login page if accessing root
  if (pathname === '/' && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is authenticated and on login page, redirect to dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protect management routes
  if (pathname.startsWith('/management') || pathname.startsWith('/reports')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Get user role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'management') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // Protect staff routes
  if (pathname.startsWith('/log-inventory') || pathname.startsWith('/history')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_KEYS } from '@/lib/auth/session'

// Role-based configuration for route protection
type Role = 'owner' | 'staff' | 'student'

interface RoleConfig {
    loginPath: string
    dashboardPath: string
    cookieKey: string
    // Exact paths that are public (accessible without auth)
    publicPaths: string[] 
    // Path prefixes that are public (e.g., /owner/forgot-password/...)
    publicPrefixes: string[] 
}

const ROLES: Record<Role, RoleConfig> = {
    owner: {
        loginPath: '/owner/login',
        dashboardPath: '/owner',
        cookieKey: COOKIE_KEYS.OWNER,
        publicPaths: ['/owner/login', '/owner/register'],
        publicPrefixes: ['/owner/forgot-password', '/owner/reset-password']
    },
    staff: {
        loginPath: '/staff/login',
        dashboardPath: '/staff/dashboard',
        cookieKey: COOKIE_KEYS.STAFF,
        publicPaths: ['/staff/login'],
        publicPrefixes: ['/staff/forgot-password', '/staff/reset-password']
    },
    student: {
        loginPath: '/student/login',
        dashboardPath: '/student/home',
        cookieKey: COOKIE_KEYS.STUDENT,
        publicPaths: ['/student/login', '/student/register'],
        publicPrefixes: ['/student/forgot-password', '/student/reset-password']
    }
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 1. Handle specific edge case redirects
    // Redirect /student to /student/home
    if (pathname === '/student') {
        return NextResponse.redirect(new URL('/student/home', request.url))
    }

    // 2. Identify the role based on the URL path
    const roleKey = (Object.keys(ROLES) as Role[]).find(role => pathname.startsWith(`/${role}`))

    // 3. Apply role-based protection logic
    if (roleKey) {
        const config = ROLES[roleKey]
        const isAuthenticated = request.cookies.has(config.cookieKey)
        
        const isPublicPath = 
            config.publicPaths.includes(pathname) || 
            config.publicPrefixes.some(prefix => pathname.startsWith(prefix))

        if (isPublicPath) {
            // If user is already logged in and tries to access login/register pages,
            // redirect them to their dashboard
            if (isAuthenticated && (pathname === config.loginPath || pathname.endsWith('/register'))) {
                return NextResponse.redirect(new URL(config.dashboardPath, request.url))
            }
            // Allow access to public pages
            return NextResponse.next()
        }

        // For all other routes (protected), check authentication
        if (!isAuthenticated) {
            const loginUrl = new URL(config.loginPath, request.url)
            // Optional: Append return URL logic here if needed
            // loginUrl.searchParams.set('from', pathname)
            return NextResponse.redirect(loginUrl)
        }
    }

    // 4. Allow all other requests
    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder assets (images, etc)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
    ],
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { COOKIE_KEYS } from '@/lib/auth/constants'

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
        dashboardPath: '/owner/dashboard',
        cookieKey: COOKIE_KEYS.OWNER,
        publicPaths: ['/owner/login', '/owner/register'],
        publicPrefixes: ['/owner/forgot-password', '/owner/reset-password', '/owner/verification']
    },
    staff: {
        loginPath: '/staff/login',
        dashboardPath: '/staff/dashboard',
        cookieKey: COOKIE_KEYS.STAFF,
        publicPaths: ['/staff/login'],
        publicPrefixes: ['/staff/forgot-password', '/staff/reset-password', '/staff/verification']
    },
    student: {
        loginPath: '/student/login',
        dashboardPath: '/student/home',
        cookieKey: COOKIE_KEYS.STUDENT,
        publicPaths: ['/student/login', '/student/register', '/student/book'], // /student/book is public booking
        publicPrefixes: ['/student/forgot-password', '/student/reset-password', '/student/verification']
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 0. Handle global public routes (e.g. /discover)
    if (pathname.startsWith('/discover')) {
        return NextResponse.next()
    }

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
            // We only do this for login/register, not for other public pages like booking or verification
            const isAuthPage = pathname === config.loginPath || pathname.endsWith('/register')
            
            if (isAuthenticated && isAuthPage) {
                return NextResponse.redirect(new URL(config.dashboardPath, request.url))
            }
            // Allow access to public pages
            return NextResponse.next()
        }

        // For all other routes (protected), check authentication
        if (!isAuthenticated) {
            const loginUrl = new URL(config.loginPath, request.url)
            loginUrl.searchParams.set('callbackUrl', pathname)
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

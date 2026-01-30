import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { COOKIE_KEYS } from '@/lib/auth/session'

// Define protected routes
const ROUTES = {
    owner: {
        dashboard: '/owner',
        login: '/owner/login'
    },
    staff: {
        dashboard: '/staff',
        login: '/staff/login'
    },
    student: {
        dashboard: '/student',
        login: '/auth/login' // Assuming student login is generic /auth/login or /login
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // 1. Owner Routes Protection
    if (pathname.startsWith('/owner')) {
        // Skip public routes
        if (
            pathname === ROUTES.owner.login ||
            pathname === '/owner/register' ||
            pathname.startsWith('/owner/forgot-password') ||
            pathname.startsWith('/owner/reset-password')
        ) {
            // If already logged in, redirect to dashboard (only for login/register)
            if (
                (pathname === ROUTES.owner.login || pathname === '/owner/register') && 
                request.cookies.has(COOKIE_KEYS.OWNER)
            ) {
                return NextResponse.redirect(new URL(ROUTES.owner.dashboard, request.url))
            }
            return NextResponse.next()
        }

        // Protect other owner routes
        if (!request.cookies.has(COOKIE_KEYS.OWNER)) {
            const loginUrl = new URL(ROUTES.owner.login, request.url)
            // Add return URL for better UX
            // loginUrl.searchParams.set('from', pathname)
            return NextResponse.redirect(loginUrl)
        }
    }

    // 2. Staff Routes Protection
    if (pathname.startsWith('/staff')) {
        // Skip public routes
        if (
            pathname === ROUTES.staff.login ||
            pathname.startsWith('/staff/forgot-password') ||
            pathname.startsWith('/staff/reset-password')
        ) {
            // If already logged in, redirect to dashboard
            if (pathname === ROUTES.staff.login && request.cookies.has(COOKIE_KEYS.STAFF)) {
                return NextResponse.redirect(new URL(ROUTES.staff.dashboard, request.url))
            }
            return NextResponse.next()
        }

        // Protect other staff routes
        if (!request.cookies.has(COOKIE_KEYS.STAFF)) {
            return NextResponse.redirect(new URL(ROUTES.staff.login, request.url))
        }
    }

    // 3. Student Routes Protection
    // Assuming student routes start with /student or /portal
    // Adjust based on actual route structure
    if (pathname.startsWith('/student')) {
        // Skip public routes
        if (
            pathname === '/student/login' ||
            pathname === '/student/register' ||
            pathname.startsWith('/student/forgot-password') ||
            pathname.startsWith('/student/reset-password')
        ) {
            // If already logged in, redirect to dashboard (only for login/register)
            if (
                (pathname === '/student/login' || pathname === '/student/register') && 
                request.cookies.has(COOKIE_KEYS.STUDENT)
            ) {
                 // Determine redirect based on device/preference? For now dashboard.
                 return NextResponse.redirect(new URL('/student', request.url))
            }
            return NextResponse.next()
        }
        
        if (!request.cookies.has(COOKIE_KEYS.STUDENT)) {
            return NextResponse.redirect(new URL('/student/login', request.url))
        }
    }
    
    // 4. Shared Auth Routes (Login/Register)
    // If user is already logged in, redirect them away from login pages?
    // This is tricky if we have multiple user types. 
    // Usually, /auth/login is for students/public.
    if (pathname === '/student/login') {
         if (request.cookies.has(COOKIE_KEYS.STUDENT)) {
             return NextResponse.redirect(new URL('/student/home', request.url))
         }
    }

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
         * - public folder assets (images, etc - though difficult to match by folder without prefix)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
    ],
}

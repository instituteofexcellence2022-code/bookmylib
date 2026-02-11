 import { NextResponse } from 'next/server'
 import type { NextRequest } from 'next/server'
 import { COOKIE_KEYS } from '@/lib/auth/constants'
 import { verifySessionToken } from '@/lib/auth/jwt'
 
 type Role = 'owner' | 'staff' | 'student' | 'admin'
 
 interface RoleConfig {
   loginPath: string
   dashboardPath: string
   cookieKey: string
   publicPaths: string[]
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
     publicPaths: ['/student/login', '/student/register', '/student/book'],
     publicPrefixes: ['/student/forgot-password', '/student/reset-password', '/student/verification']
   },
   admin: {
     loginPath: '/admin/login',
     dashboardPath: '/admin/dashboard',
     cookieKey: COOKIE_KEYS.ADMIN,
     publicPaths: ['/admin/login'],
     publicPrefixes: []
   }
 }
 
 export default async function proxy(request: NextRequest) {
   const { pathname } = request.nextUrl
 
   if (pathname.startsWith('/discover')) {
     return NextResponse.next()
   }
 
   if (pathname === '/student') {
     return NextResponse.redirect(new URL('/student/home', request.url))
   }
 
   const roleKey = (Object.keys(ROLES) as Role[]).find(role => pathname.startsWith(`/${role}`))
 
   if (roleKey) {
     const config = ROLES[roleKey]
     const token = request.cookies.get(config.cookieKey)?.value
 
     let isAuthenticated = false
     if (token) {
       const payload = await verifySessionToken(token)
       if (payload && payload.role === roleKey) {
         isAuthenticated = true
       }
     }
 
     const isPublicPath =
       config.publicPaths.includes(pathname) ||
       config.publicPrefixes.some(prefix => pathname.startsWith(prefix))
 
     if (isPublicPath) {
       const isAuthPage = pathname === config.loginPath || pathname.endsWith('/register')
 
       if (isAuthenticated && isAuthPage) {
         return NextResponse.redirect(new URL(config.dashboardPath, request.url))
       }
       return NextResponse.next()
     }
 
     if (!isAuthenticated) {
       const loginUrl = new URL(config.loginPath, request.url)
       loginUrl.searchParams.set('callbackUrl', pathname)
       const response = NextResponse.redirect(loginUrl)
 
       if (token) {
         response.cookies.delete(config.cookieKey)
       }
 
       return response
     }
   }
 
   return NextResponse.next()
 }
 
 export const config = {
   matcher: [
     '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
   ],
 }

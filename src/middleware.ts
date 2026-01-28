import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Owner Protection Logic
  if (path.startsWith('/owner')) {
    const isPublicOwnerRoute = path === '/owner/login' || path === '/owner/register' || path === '/owner/forgot-password'
    const ownerSession = request.cookies.get('owner_session')?.value

    // If trying to access protected route without session
    if (!isPublicOwnerRoute && !ownerSession) {
      return NextResponse.redirect(new URL('/owner/login', request.url))
    }

    // If trying to access public route (login/register) with session
    if (isPublicOwnerRoute && ownerSession) {
      return NextResponse.redirect(new URL('/owner/dashboard', request.url))
    }
  }

  // Staff Protection Logic
  if (path.startsWith('/staff')) {
    const isPublicStaffRoute = path === '/staff/login' || path === '/staff/forgot-password'
    const staffSession = request.cookies.get('staff_session')?.value

    if (!isPublicStaffRoute && !staffSession) {
      return NextResponse.redirect(new URL('/staff/login', request.url))
    }

    if (isPublicStaffRoute && staffSession) {
      return NextResponse.redirect(new URL('/staff/dashboard', request.url))
    }
  }

  // Student Protection Logic
  if (path.startsWith('/student')) {
    const isPublicStudentRoute = path === '/student/login' || path === '/student/register' || path === '/student/forgot-password'
    const studentSession = request.cookies.get('student_session')?.value

    if (!isPublicStudentRoute && !studentSession) {
      return NextResponse.redirect(new URL('/student/login', request.url))
    }

    if (isPublicStudentRoute && studentSession) {
      return NextResponse.redirect(new URL('/student/home', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/owner/:path*',
    '/staff/:path*',
    '/student/:path*',
  ],
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname

  if (path.startsWith('/owner')) {
    const isPublicOwnerRoute = path === '/owner/login' || path === '/owner/register' || path === '/owner/forgot-password'
    const ownerSession = request.cookies.get('owner_session')?.value
    if (!isPublicOwnerRoute && !ownerSession) {
      return NextResponse.redirect(new URL('/owner/login', request.url))
    }
    if (isPublicOwnerRoute && ownerSession) {
      return NextResponse.redirect(new URL('/owner/dashboard', request.url))
    }
  }

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

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { COOKIE_KEYS } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const role = searchParams.get('role')
  const callbackUrl = searchParams.get('callbackUrl')

  const cookieStore = await cookies()

  if (role === 'owner') {
    cookieStore.delete(COOKIE_KEYS.OWNER)
    redirect(callbackUrl || '/owner/login')
  } else if (role === 'staff') {
    cookieStore.delete(COOKIE_KEYS.STAFF)
    redirect(callbackUrl || '/staff/login')
  } else if (role === 'student') {
    cookieStore.delete(COOKIE_KEYS.STUDENT)
    redirect(callbackUrl || '/student/login')
  }

  // Fallback
  redirect('/')
}

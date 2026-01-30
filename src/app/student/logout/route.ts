import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_KEYS } from '@/lib/auth/session'

export async function GET() {
  const cookieStore = await cookies()
  
  // Delete the session cookie
  cookieStore.delete(COOKIE_KEYS.STUDENT)
  
  // Redirect to login page
  redirect('/student/login')
}

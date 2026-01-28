import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  
  // Delete the session cookie
  cookieStore.delete('student_session')
  
  // Redirect to login page
  redirect('/student/login')
}

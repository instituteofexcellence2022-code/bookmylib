import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET() {
  const cookieStore = await cookies()
  
  // Delete the session cookie
  cookieStore.delete('student_session')
  
  // Redirect to login page
  redirect('/student/login')
}

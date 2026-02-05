import { redirect } from 'next/navigation'
import { deleteSession } from '@/lib/auth/session'

export async function GET() {
  await deleteSession('student')
  
  // Redirect to login page
  redirect('/student/login')
}

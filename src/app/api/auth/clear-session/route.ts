import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { deleteSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const role = searchParams.get('role')
  const callbackUrl = searchParams.get('callbackUrl')

  if (role === 'owner') {
    await deleteSession('owner')
    redirect(callbackUrl || '/owner/login')
  } else if (role === 'staff') {
    await deleteSession('staff')
    redirect(callbackUrl || '/staff/login')
  } else if (role === 'student') {
    await deleteSession('student')
    redirect(callbackUrl || '/student/login')
  } else if (role === 'admin') {
    await deleteSession('admin')
    redirect(callbackUrl || '/admin/login')
  }

  // Fallback
  redirect('/')
}

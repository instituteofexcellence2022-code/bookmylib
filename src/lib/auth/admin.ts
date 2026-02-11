import { cookies } from 'next/headers'
import { COOKIE_KEYS } from './constants'
import { verifySessionToken } from './jwt'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function getAuthenticatedAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_KEYS.ADMIN)?.value

  if (!token) return null

  const payload = await verifySessionToken(token)
  
  if (!payload || payload.role !== 'admin') return null

  const admin = await prisma.platformUser.findUnique({
    where: { id: payload.userId as string },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      // exclude password
    }
  })

  if (!admin) {
    redirect('/api/auth/clear-session?role=admin')
  }

  return admin
}

export async function requireAdmin() {
  const admin = await getAuthenticatedAdmin()
  
  if (!admin) {
    redirect('/admin/login')
  }
  
  return admin
}

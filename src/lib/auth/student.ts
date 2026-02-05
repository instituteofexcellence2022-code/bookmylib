import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from './constants'
import { verifySessionToken } from './jwt'

export async function getAuthenticatedStudent() {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_KEYS.STUDENT)?.value

    if (!token) return null

    const payload = await verifySessionToken(token)
    if (!payload || !payload.userId) return null
    
    const studentId = payload.userId as string

    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: { 
                library: true,
                branch: true,
                subscriptions: {
                    where: { status: 'active' },
                    include: { plan: true }
                }
            }
        })
        return student
    } catch (error) {
        console.error('Error fetching authenticated student:', error)
        return null
    }
}

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from './session'

export async function getAuthenticatedStudent() {
    const cookieStore = await cookies()
    const studentId = cookieStore.get(COOKIE_KEYS.STUDENT)?.value

    if (!studentId) return null

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

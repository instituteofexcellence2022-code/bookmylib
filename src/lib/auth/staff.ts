import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function getAuthenticatedStaff() {
    const cookieStore = await cookies()
    const staffId = cookieStore.get('staff_session')?.value

    if (!staffId) return null

    const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        include: { 
            library: true,
            branch: true 
        }
    })

    return staff
}

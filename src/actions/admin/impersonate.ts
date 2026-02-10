'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { createSession, deleteSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/lib/auth/constants'

export async function impersonateOwner(ownerId: string) {
    // 1. Verify Admin
    await requireAdmin()

    // 2. Verify Owner exists
    const owner = await prisma.owner.findUnique({
        where: { id: ownerId }
    })

    if (!owner) {
        return { success: false, error: 'Owner not found' }
    }

    // 3. Create Session for Owner
    // This will set the 'session_owner' cookie
    await createSession(owner.id, 'owner')

    // 4. Redirect to Owner Dashboard
    // Note: We return success instead of redirecting here to avoid NEXT_REDIRECT error on client catch
    return { success: true }
}

export async function stopImpersonation() {
    const cookieStore = await cookies()
    
    // Verify we are actually an admin before redirecting to admin
    const adminToken = cookieStore.get(COOKIE_KEYS.ADMIN)
    
    if (!adminToken) {
        return { success: false, error: 'No active admin session found' }
    }

    // Delete the owner session
    await deleteSession('owner')

    // Redirect back to admin dashboard
    redirect('/admin/libraries')
}

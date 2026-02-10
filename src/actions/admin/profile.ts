'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

export async function getAdminProfile() {
    const session = await requireAdmin()
    
    const admin = await prisma.platformUser.findUnique({
        where: { id: session.id },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
            bio: true,
            role: true,
            createdAt: true,
            lastLogin: true,
            preferences: true
        }
    })

    return admin
}

export async function updateAdminProfile(data: any) {
    const session = await requireAdmin()

    try {
        await prisma.platformUser.update({
            where: { id: session.id },
            data: {
                name: data.name,
                phone: data.phone,
                bio: data.bio,
                image: data.image,
            }
        })
        
        revalidatePath('/admin/profile')
        return { success: true }
    } catch (error) {
        console.error('Update profile error:', error)
        return { success: false, error: 'Failed to update profile' }
    }
}

export async function updateAdminPassword(currentPassword: string, newPassword: string) {
    const session = await requireAdmin()
    
    const admin = await prisma.platformUser.findUnique({
        where: { id: session.id }
    })

    if (!admin) return { success: false, error: 'User not found' }

    const isValid = await bcrypt.compare(currentPassword, admin.password)
    if (!isValid) {
        return { success: false, error: 'Current password is incorrect' }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.platformUser.update({
        where: { id: session.id },
        data: { password: hashedPassword }
    })

    return { success: true }
}

export async function getMyAuditLogs() {
    const session = await requireAdmin()
    return prisma.platformAuditLog.findMany({
        where: { platformUserId: session.id },
        orderBy: { createdAt: 'desc' },
        take: 20
    })
}

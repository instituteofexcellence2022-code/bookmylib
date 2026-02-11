'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'

export async function getPlatformSettings() {
    await requireAdmin()

    let settings = await prisma.platformSettings.findFirst()

    if (!settings) {
        settings = await prisma.platformSettings.create({
            data: {
                platformName: 'Library SaaS',
                maintenanceMode: false,
                enableRegistrations: true,
                enableEmailNotifs: true
            }
        })
    }

    return settings
}

export async function updatePlatformSettings(data: any) {
    const session = await requireAdmin()

    const settings = await prisma.platformSettings.findFirst()
    
    if (!settings) {
        return { success: false, error: 'Settings not found' }
    }

    await prisma.platformSettings.update({
        where: { id: settings.id },
        data: {
            platformName: data.platformName,
            supportEmail: data.supportEmail,
            supportPhone: data.supportPhone,
            maintenanceMode: data.maintenanceMode,
            maintenanceMsg: data.maintenanceMsg,
            enableRegistrations: data.enableRegistrations,
            enableEmailNotifs: data.enableEmailNotifs
        }
    })

    // Log audit
    await prisma.platformAuditLog.create({
        data: {
            platformUserId: session.id,
            action: 'UPDATE_SETTINGS',
            details: 'Updated platform configuration',
            ipAddress: '127.0.0.1'
        }
    })

    revalidatePath('/admin/settings')
    return { success: true }
}
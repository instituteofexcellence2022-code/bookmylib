'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

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

const updateSchema = z.object({
    platformName: z.string().min(1),
    supportEmail: z.string().email().optional().or(z.literal('')),
    supportPhone: z.string().optional().or(z.literal('')),
    maintenanceMode: z.boolean(),
    maintenanceMsg: z.string().optional().or(z.literal('')),
    enableRegistrations: z.boolean(),
    enableEmailNotifs: z.boolean()
})

export async function updatePlatformSettings(data: unknown) {
    const session = await requireAdmin()

    const settings = await prisma.platformSettings.findFirst()
    
    if (!settings) {
        return { success: false, error: 'Settings not found' }
    }
    const parsed = updateSchema.safeParse(data)
    if (!parsed.success) {
        return { success: false, error: 'Invalid settings' }
    }

    await prisma.platformSettings.update({
        where: { id: settings.id },
        data: {
            platformName: parsed.data.platformName,
            supportEmail: parsed.data.supportEmail || null,
            supportPhone: parsed.data.supportPhone || null,
            maintenanceMode: parsed.data.maintenanceMode,
            maintenanceMsg: parsed.data.maintenanceMsg || null,
            enableRegistrations: parsed.data.enableRegistrations,
            enableEmailNotifs: parsed.data.enableEmailNotifs
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

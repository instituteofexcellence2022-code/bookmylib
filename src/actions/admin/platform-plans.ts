'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const planSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    description: z.string().optional(),
    priceMonthly: z.number().min(0),
    priceYearly: z.number().min(0),
    trialDays: z.number().int().min(0).default(0),
    isPopular: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
    maxBranches: z.number().int().min(1),
    maxActiveStudents: z.number().int().min(1).default(100),
    maxTotalStudents: z.number().int().min(1).default(500),
    maxSeats: z.number().int().min(1).default(50),
    maxStorage: z.number().int().min(1), // MB
    maxStaff: z.number().int().min(1),
    maxEmailsMonthly: z.number().int().min(0).default(1000),
    maxSmsMonthly: z.number().int().min(0).default(100),
    features: z.record(z.string(), z.boolean()).optional(),
})

export type PlanFormData = z.infer<typeof planSchema>

export async function getSaasPlans() {
    await requireAdmin()
    return prisma.saasPlan.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
            _count: {
                select: { subscriptions: true }
            }
        }
    })
}

export async function createSaasPlan(data: PlanFormData) {
    await requireAdmin()
    
    const validated = planSchema.parse(data)
    
    try {
        await prisma.saasPlan.create({
            data: {
                ...validated,
                features: validated.features || {}
            }
        })
        revalidatePath('/admin/plans')
        return { success: true }
    } catch (error: any) {
        if (error.code === 'P2002') {
            return { success: false, error: 'Slug must be unique' }
        }
        return { success: false, error: error.message }
    }
}

export async function updateSaasPlan(id: string, data: Partial<PlanFormData>) {
    await requireAdmin()
    
    try {
        await prisma.saasPlan.update({
            where: { id },
            data: {
                ...data,
                features: data.features || undefined
            }
        })
        revalidatePath('/admin/plans')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function toggleSaasPlanStatus(id: string, isActive: boolean) {
    await requireAdmin()
    
    await prisma.saasPlan.update({
        where: { id },
        data: { isActive }
    })
    revalidatePath('/admin/plans')
    return { success: true }
}

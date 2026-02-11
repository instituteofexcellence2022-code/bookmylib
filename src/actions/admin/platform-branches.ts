'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'

export async function getBranchDetails(branchId: string) {
    await requireAdmin()

    const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        include: {
            staff: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    status: true,
                    isActive: true,
                    createdAt: true
                },
                take: 5,
                orderBy: { createdAt: 'desc' }
            },
            seats: {
                select: {
                    id: true,
                    number: true,
                    section: true,
                    type: true,
                    isActive: true
                },
                take: 5,
                orderBy: { number: 'asc' }
            },
            lockers: {
                select: {
                    id: true,
                    number: true,
                    section: true,
                    type: true,
                    isActive: true
                },
                take: 5,
                orderBy: { number: 'asc' }
            },
            _count: {
                select: {
                    staff: true,
                    seats: true,
                    lockers: true
                }
            }
        }
    })

    if (!branch) throw new Error('Branch not found')

    return branch
}

export async function toggleBranchStatus(branchId: string, isActive: boolean) {
    await requireAdmin()

    await prisma.branch.update({
        where: { id: branchId },
        data: { isActive }
    })

    revalidatePath('/admin/libraries')
    return { success: true }
}

export async function updateBranch(
    branchId: string,
    data: {
        name?: string
        managerName?: string
        contactPhone?: string
        contactEmail?: string
        address?: string
        city?: string
        district?: string
        state?: string
        pincode?: string
        description?: string
        mapsLink?: string
        seatCount?: number
        area?: string
        latitude?: number | null
        longitude?: number | null
        amenities?: string[] | string | null
        operatingHours?: Record<string, any> | null
        upiId?: string | null
        payeeName?: string | null
        hasLockers?: boolean
        isLockerSeparate?: boolean
        totalLockers?: number
    }
) {
    await requireAdmin()

    // Normalize amenities to stringified JSON array
    let amenitiesStr: string | null | undefined = undefined
    if (data.amenities !== undefined) {
        if (Array.isArray(data.amenities)) {
            amenitiesStr = JSON.stringify(data.amenities)
        } else if (typeof data.amenities === 'string') {
            amenitiesStr = data.amenities
        } else {
            amenitiesStr = null
        }
    }

    try {
        await prisma.branch.update({
            where: { id: branchId },
            data: {
                name: data.name,
                managerName: data.managerName,
                contactPhone: data.contactPhone,
                contactEmail: data.contactEmail,
                address: data.address,
                city: data.city,
                district: data.district,
                state: data.state,
                pincode: data.pincode,
                description: data.description,
                mapsLink: data.mapsLink,
                seatCount: data.seatCount,
                area: data.area,
                latitude: data.latitude ?? undefined,
                longitude: data.longitude ?? undefined,
                amenities: amenitiesStr,
                operatingHours: data.operatingHours ?? undefined,
                upiId: data.upiId ?? undefined,
                payeeName: data.payeeName ?? undefined,
                hasLockers: data.hasLockers,
                isLockerSeparate: data.isLockerSeparate,
                totalLockers: data.totalLockers
            }
        })

        revalidatePath('/admin/libraries')
        return { success: true }
    } catch (error) {
        console.error('Update branch error:', error)
        return { success: false, error: 'Failed to update branch' }
    }
}

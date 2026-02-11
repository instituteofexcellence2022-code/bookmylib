'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'

const createLibrarySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    subdomain: z.string().min(1, 'Subdomain is required').regex(/^[a-z0-9-]+$/, 'Subdomain must be lowercase alphanumeric with hyphens'),
    ownerName: z.string().min(1, 'Owner name is required'),
    ownerEmail: z.string().email('Invalid email'),
    ownerPassword: z.string().min(6, 'Password must be at least 6 characters'),
    planId: z.string().min(1, 'Plan is required')
})

export type CreateLibraryFormData = z.infer<typeof createLibrarySchema>

export async function createLibrary(data: CreateLibraryFormData) {
    await requireAdmin()
    
    const validated = createLibrarySchema.parse(data)
    
    // Check subdomain uniqueness
    const existingSubdomain = await prisma.library.findUnique({
        where: { subdomain: validated.subdomain }
    })
    
    if (existingSubdomain) {
        return { success: false, error: 'Subdomain already exists' }
    }
    
    // Check owner email uniqueness
    const existingOwner = await prisma.owner.findUnique({
        where: { email: validated.ownerEmail }
    })
    
    if (existingOwner) {
        return { success: false, error: 'Owner email already exists' }
    }
    
    // Check plan exists
    const plan = await prisma.saasPlan.findUnique({
        where: { id: validated.planId }
    })
    
    if (!plan) {
        return { success: false, error: 'Selected plan not found' }
    }
    
    const hashedPassword = await bcrypt.hash(validated.ownerPassword, 10)
    
    try {
        await prisma.$transaction(async (tx) => {
            // Create Library
            const library = await tx.library.create({
                data: {
                    name: validated.name,
                    subdomain: validated.subdomain,
                    isActive: true,
                }
            })
            
            // Create Owner
            await tx.owner.create({
                data: {
                    libraryId: library.id,
                    name: validated.ownerName,
                    email: validated.ownerEmail,
                    password: hashedPassword,
                }
            })
            
            // Create Subscription
            await tx.librarySubscription.create({
                data: {
                    libraryId: library.id,
                    planId: plan.id,
                    status: 'active',
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)), // 1 month default
                }
            })
        })
        
        revalidatePath('/admin/libraries')
        return { success: true }
    } catch (error: any) {
        console.error('Create library error:', error)
        return { success: false, error: 'Failed to create library' }
    }
}

export async function getLibraryDetails(id: string) {
    await requireAdmin()
    
    const library = await prisma.library.findUnique({
        where: { id },
        include: {
            owners: true,
            subscription: {
                include: {
                    plan: true
                }
            },
            branches: {
                include: {
                    _count: {
                        select: {
                            staff: true
                        }
                    }
                }
            },
            _count: {
                select: {
                    students: true,
                    branches: true,
                    payments: true,
                    staff: true
                }
            }
        }
    })
    
    if (!library) throw new Error('Library not found')
    
    return library
}

export async function updateLibrary(id: string, data: { name?: string, contactEmail?: string, contactPhone?: string, address?: string, website?: string }) {
    await requireAdmin()
    
    try {
        await prisma.library.update({
            where: { id },
            data
        })
        revalidatePath('/admin/libraries')
        return { success: true }
    } catch (error) {
        console.error('Update library error:', error)
        return { success: false, error: 'Failed to update library' }
    }
}

const createOwnerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters')
})

export async function createLibraryOwner(libraryId: string, data: z.infer<typeof createOwnerSchema>) {
    await requireAdmin()
    
    const validated = createOwnerSchema.parse(data)
    
    // Check email uniqueness
    const existingOwner = await prisma.owner.findUnique({
        where: { email: validated.email }
    })
    
    if (existingOwner) {
        return { success: false, error: 'Owner email already exists' }
    }
    
    const hashedPassword = await bcrypt.hash(validated.password, 10)
    
    try {
        await prisma.owner.create({
            data: {
                libraryId,
                name: validated.name,
                email: validated.email,
                password: hashedPassword
            }
        })
        
        revalidatePath('/admin/libraries')
        return { success: true }
    } catch (error) {
        console.error('Create owner error:', error)
        return { success: false, error: 'Failed to create owner' }
    }
}

export interface BranchWithStats {
    id: string
    name: string
    city: string
    managerName: string | null
    contactPhone: string | null
    seatCount: number
    isActive: boolean
    createdAt: Date
    stats: {
        studentsCount: number
        staffCount: number
    }
}

export interface LibraryWithStats {
    id: string
    name: string
    subdomain: string
    isActive: boolean
    createdAt: Date
    owner: {
        id: string
        name: string
        email: string
    } | null
    subscription: {
        status: string
        currentPeriodEnd: Date
        plan: {
            name: string
            maxActiveStudents: number
            maxTotalStudents: number
            maxSeats: number
            maxBranches: number
            maxStorage: number
        }
    } | null
    stats: {
        studentsCount: number
        branchesCount: number
        activeStudents: number // Active in last 30 days (mock or real)
    },
    branches: BranchWithStats[]
}

export async function getLibraries(query?: string): Promise<LibraryWithStats[]> {
    await requireAdmin()

    const libraries = await prisma.library.findMany({
        where: query ? {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { subdomain: { contains: query, mode: 'insensitive' } },
                { owners: { some: { email: { contains: query, mode: 'insensitive' } } } }
            ]
        } : undefined,
        include: {
            owners: {
                take: 1,
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            subscription: {
                include: {
                    plan: true
                }
            },
            branches: {
                select: {
                    id: true,
                    name: true,
                    address: true,
                    contactPhone: true,
                    seatCount: true,
                    isActive: true,
                    createdAt: true,
                    _count: {
                        select: {
                            staff: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            },
            _count: {
                select: {
                    students: true,
                    branches: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    // Transform to friendlier format
    return libraries.map(lib => ({
        id: lib.id,
        name: lib.name,
        subdomain: lib.subdomain,
        isActive: lib.isActive,
        createdAt: lib.createdAt,
        owner: lib.owners[0] || null,
        subscription: lib.subscription ? {
            status: lib.subscription.status,
            currentPeriodEnd: lib.subscription.currentPeriodEnd,
            plan: {
                name: lib.subscription.plan.name,
                maxActiveStudents: 0, // TODO: Extract from features
                maxTotalStudents: 0,
                maxSeats: 0,
                maxBranches: 0,
                maxStorage: 0,
            }
        } : null,
        stats: {
            studentsCount: lib._count.students,
            branchesCount: lib._count.branches,
            activeStudents: lib._count.students // TODO: Implement real "active" logic based on attendance/login
        },
        branches: lib.branches.map(branch => ({
            id: branch.id,
            name: branch.name,
            city: branch.address, // Mapping address to city
            managerName: null, // Not available
            contactPhone: branch.contactPhone,
            seatCount: branch.seatCount,
            isActive: branch.isActive,
            createdAt: branch.createdAt,
            stats: {
                studentsCount: 0, // Not available
                staffCount: branch._count.staff
            }
        }))
    }))
}

export async function toggleLibraryStatus(libraryId: string, isActive: boolean) {
    await requireAdmin()
    
    try {
        await prisma.library.update({
            where: { id: libraryId },
            data: { isActive }
        })
        
        return { success: true }
    } catch (error) {
        console.error('Failed to toggle library status:', error)
        return { success: false, error: 'Failed to update status' }
    }
}

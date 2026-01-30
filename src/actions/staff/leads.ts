'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { sendWelcomeEmail } from '@/actions/email'
import { COOKIE_KEYS } from '@/lib/auth/session'

export type LeadFilter = {
    page?: number
    limit?: number
    search?: string
    status?: string
    source?: string
}

export type CreateLeadInput = {
    name: string
    phone: string
    email?: string
    source?: string
    notes?: string
    status?: string
}

// Helper to get authenticated staff
async function getAuthenticatedStaff() {
    const cookieStore = await cookies()
    const staffId = cookieStore.get(COOKIE_KEYS.STAFF)?.value

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

export async function getLeads(filters: LeadFilter) {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

    const page = filters.page || 1
    const limit = filters.limit || 10
    const skip = (page - 1) * limit

    const where: any = {
        libraryId: staff.libraryId,
        branchId: staff.branchId, // Strictly scoped to staff's branch
    }

    if (filters.status && filters.status !== 'all') {
        where.status = filters.status
    }

    if (filters.source && filters.source !== 'all') {
        where.source = filters.source
    }

    if (filters.search) {
        where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
        ]
    }

    try {
        const [leads, total] = await Promise.all([
            prisma.lead.findMany({
                where,
                include: {
                    interactions: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                    _count: {
                        select: { interactions: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.lead.count({ where })
        ])

        return {
            leads,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        }
    } catch (error) {
        console.error('Error fetching leads:', error)
        throw new Error('Failed to fetch leads')
    }
}

export async function createLead(data: CreateLeadInput) {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

    if (!/^\d{10}$/.test(data.phone)) {
        throw new Error('Phone number must be exactly 10 digits')
    }

    try {
        const lead = await prisma.lead.create({
            data: {
                libraryId: staff.libraryId,
                branchId: staff.branchId,
                name: data.name,
                phone: data.phone,
                email: data.email,
                source: data.source || 'walk_in',
                status: data.status || 'new',
            }
        })

        // Log initial interaction if notes are provided
        if (data.notes) {
            await prisma.leadInteraction.create({
                data: {
                    leadId: lead.id,
                    staffId: staff.id,
                    type: 'note',
                    notes: 'Initial notes: ' + data.notes
                }
            })
        }

        revalidatePath('/staff/leads')
        return { success: true, lead }
    } catch (error) {
        console.error('Error creating lead:', error)
        throw new Error('Failed to create lead')
    }
}

export async function updateLeadStatus(leadId: string, status: string) {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

    try {
        const lead = await prisma.lead.update({
            where: { 
                id: leadId,
                branchId: staff.branchId // Security check
            },
            data: { status }
        })

        // Log status change interaction
        await prisma.leadInteraction.create({
            data: {
                leadId: lead.id,
                staffId: staff.id,
                type: 'status_change',
                notes: `Status updated to ${status}`
            }
        })

        revalidatePath('/staff/leads')
        return { success: true, lead }
    } catch (error) {
        console.error('Error updating lead status:', error)
        throw new Error('Failed to update lead status')
    }
}

export async function addLeadInteraction(leadId: string, type: string, notes: string) {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

    try {
        // Verify lead ownership
        const lead = await prisma.lead.findFirst({
            where: {
                id: leadId,
                branchId: staff.branchId
            }
        })

        if (!lead) throw new Error('Lead not found')

        const interaction = await prisma.leadInteraction.create({
            data: {
                leadId,
                staffId: staff.id,
                type,
                notes
            }
        })

        // Update lead updated_at
        await prisma.lead.update({
            where: { id: leadId },
            data: { updatedAt: new Date() }
        })

        revalidatePath('/staff/leads')
        return { success: true, interaction }
    } catch (error) {
        console.error('Error adding interaction:', error)
        throw new Error('Failed to add interaction')
    }
}

export async function convertLeadToStudent(leadId: string, data: { password: string, email?: string }) {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

    try {
        const lead = await prisma.lead.findFirst({
            where: {
                id: leadId,
                branchId: staff.branchId
            }
        })

        if (!lead) throw new Error('Lead not found')

        // Use provided email or lead email
        const email = data.email || lead.email
        if (!email) throw new Error('Email is required for student conversion')

        // Check if student exists
        const existingStudent = await prisma.student.findUnique({
            where: { email }
        })

        if (existingStudent) throw new Error('Student with this email already exists')

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10)

        // Create student
        const student = await prisma.student.create({
            data: {
                name: lead.name,
                email,
                phone: lead.phone,
                password: hashedPassword,
                libraryId: staff.libraryId,
                branchId: staff.branchId,
                isBlocked: false,
                source: 'lead_conversion'
            }
        })

        // Send Welcome Email
        await sendWelcomeEmail({
            studentName: student.name,
            studentEmail: student.email,
            libraryName: staff.library?.name
        })

        // Update lead status
        await prisma.lead.update({
            where: { id: leadId },
            data: { status: 'converted' }
        })

        // Log interaction on lead
        await prisma.leadInteraction.create({
            data: {
                leadId,
                staffId: staff.id,
                type: 'conversion',
                notes: `Converted to student: ${student.name} (${student.id})`
            }
        })

        // Log staff activity
        await prisma.staffActivity.create({
            data: {
                libraryId: staff.libraryId,
                staffId: staff.id,
                type: 'create',
                action: 'Convert Lead',
                details: `Converted lead ${lead.name} to student`,
                entity: 'Student Management',
                status: 'success'
            }
        })

        revalidatePath('/staff/leads')
        revalidatePath('/staff/students')
        
        return { success: true, studentId: student.id }
    } catch (error) {
        console.error('Error converting lead:', error)
        throw error
    }
}

export async function getLeadDetails(leadId: string) {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

    try {
        const lead = await prisma.lead.findFirst({
            where: {
                id: leadId,
                branchId: staff.branchId
            },
            include: {
                interactions: {
                    include: {
                        staff: {
                            select: { name: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        return lead
    } catch (error) {
        console.error('Error fetching lead details:', error)
        throw new Error('Failed to fetch lead details')
    }
}

'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { sendWelcomeEmail } from '@/actions/email'
import { getAuthenticatedStaff } from '@/lib/auth/staff'

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
// Removed local helper in favor of imported one

export async function getLeads(filters: LeadFilter) {
    try {
        const staff = await getAuthenticatedStaff()
        if (!staff) return { success: false, error: 'Unauthorized' }

        const page = filters.page || 1
        const limit = filters.limit || 10
        const skip = (page - 1) * limit

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            success: true,
            data: {
                leads,
                metadata: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            }
        }
    } catch (error) {
        console.error('Error fetching leads:', error)
        return { success: false, error: 'Failed to fetch leads' }
    }
}

export async function createLead(data: CreateLeadInput) {
    try {
        const staff = await getAuthenticatedStaff()
        if (!staff) return { success: false, error: 'Unauthorized' }

        if (!/^\d{10}$/.test(data.phone)) {
            return { success: false, error: 'Phone number must be exactly 10 digits' }
        }

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
        return { success: true, data: lead }
    } catch (error) {
        console.error('Error creating lead:', error)
        return { success: false, error: 'Failed to create lead' }
    }
}

export async function updateLeadStatus(leadId: string, status: string) {
    try {
        const staff = await getAuthenticatedStaff()
        if (!staff) return { success: false, error: 'Unauthorized' }

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
        return { success: true, data: lead }
    } catch (error) {
        console.error('Error updating lead status:', error)
        return { success: false, error: 'Failed to update lead status' }
    }
}

export async function addLeadInteraction(leadId: string, type: string, notes: string) {
    try {
        const staff = await getAuthenticatedStaff()
        if (!staff) return { success: false, error: 'Unauthorized' }

        // Verify lead ownership
        const lead = await prisma.lead.findFirst({
            where: {
                id: leadId,
                branchId: staff.branchId
            }
        })

        if (!lead) return { success: false, error: 'Lead not found' }

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
        return { success: true, data: interaction }
    } catch (error) {
        console.error('Error adding interaction:', error)
        return { success: false, error: 'Failed to add interaction' }
    }
}

export async function convertLeadToStudent(leadId: string, data: { password: string, email?: string }) {
    try {
        const staff = await getAuthenticatedStaff()
        if (!staff) return { success: false, error: 'Unauthorized' }

        const lead = await prisma.lead.findFirst({
            where: {
                id: leadId,
                branchId: staff.branchId
            }
        })

        if (!lead) return { success: false, error: 'Lead not found' }

        // Use provided email or lead email
        const email = data.email || lead.email
        if (!email) return { success: false, error: 'Email is required for student conversion' }

        // Check if student exists
        const existingStudent = await prisma.student.findUnique({
            where: { email }
        })

        if (existingStudent) return { success: false, error: 'Student with this email already exists' }

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
        if (student.email) {
            await sendWelcomeEmail({
                studentName: student.name,
                studentEmail: student.email,
                libraryName: staff.library?.name
            })
        }

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
        
        return { success: true, data: { studentId: student.id } }
    } catch (error) {
        console.error('Error converting lead:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to convert lead' }
    }
}

export async function getLeadDetails(leadId: string) {
    try {
        const staff = await getAuthenticatedStaff()
        if (!staff) return { success: false, error: 'Unauthorized' }

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

        return { success: true, data: lead }
    } catch (error) {
        console.error('Error fetching lead details:', error)
        return { success: false, error: 'Failed to fetch lead details' }
    }
}

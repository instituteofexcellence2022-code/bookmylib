'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getOwnerProfile } from './owner'
import { getStaffProfile } from './staff'
import { uploadFile } from './upload'

// Student Actions

export async function createTicket(formData: FormData) {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_session')?.value

  if (!studentId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { 
        libraryId: true,
        isBlocked: true,
        branchId: true, // Auto-select branchId from student record
        branch: {
          select: {
            libraryId: true
          }
        },
        subscriptions: {
          where: { status: 'active' },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            libraryId: true,
            branchId: true
          }
        }
      }
    })

    if (!student) {
      console.error('Student not found for ID:', studentId)
      return { success: false, error: 'Student not found' }
    }

    if (student.isBlocked) {
      return { success: false, error: 'Your account is blocked. Please contact the administration.' }
    }

    let libraryId = student.libraryId
    let branchId = student.branchId

    // Fallback 1: Try to get libraryId from branch if missing
    if (!libraryId && student.branch?.libraryId) {
      libraryId = student.branch.libraryId
    }

    // Fallback 2: Try to get context from active subscription
    if ((!libraryId || !branchId) && student.subscriptions.length > 0) {
      const activeSub = student.subscriptions[0]
      if (!libraryId) libraryId = activeSub.libraryId
      if (!branchId) branchId = activeSub.branchId
    }

    // Auto-heal: Update student record if we found missing context
    if ((!student.libraryId && libraryId) || (!student.branchId && branchId)) {
      try {
        await prisma.student.update({
          where: { id: studentId },
          data: { 
            libraryId: libraryId || undefined,
            branchId: branchId || undefined
          }
        })
      } catch (e) {
        console.warn('Failed to auto-heal student context:', e)
      }
    }

    if (!libraryId) {
      console.error('Student has no library assigned:', studentId)
      return { success: false, error: 'Student not assigned to a library' }
    }

    if (!branchId) {
       console.warn('Student has no branch assigned, ticket will be library-level only:', studentId)
       // Optional: We could block ticket creation if branch is mandatory, 
       // but for now allowing library-level tickets seems safer unless strict tenancy is required.
       // Given the user request "report to respective branch", we should try to ensure it.
    }

    const subject = formData.get('subject') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const priority = (formData.get('priority') as string) || 'medium'
    const attachment = formData.get('attachment') as File

    let attachmentUrl = null
    if (attachment && attachment.size > 0) {
      try {
        attachmentUrl = await uploadFile(attachment)
      } catch (e) {
        console.error('Attachment upload failed:', e)
      }
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        libraryId,
        studentId,
        branchId, // Link ticket to specific branch
        subject,
        description,
        category,
        priority,
        status: 'open',
        attachmentUrl
      }
    })

    revalidatePath('/student/issues')
    return { success: true, ticket }
  } catch (error) {
    console.error('Error creating ticket:', error)
    return { success: false, error: 'Failed to create ticket' }
  }
}

export async function getStudentTickets() {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_session')?.value

  if (!studentId) return []

  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        comments: true
      }
    })
    return tickets
  } catch (error) {
    console.error('Error fetching tickets:', error)
    return []
  }
}

// Owner Actions

export async function getOwnerTickets(filters: { status?: string; category?: string } = {}) {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) return []

  try {
    const whereClause: any = {
      libraryId: owner.libraryId
    }

    if (filters.status && filters.status !== 'all') {
      whereClause.status = filters.status
    }
    
    if (filters.category && filters.category !== 'all') {
      whereClause.category = filters.category
    }

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            name: true,
            email: true,
            image: true,
            branchId: true,
            branch: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        staff: {
            select: {
                name: true
            }
        },
        comments: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return tickets
  } catch (error) {
    console.error('Error fetching owner tickets:', error)
    return []
  }
}

export async function getStaffTickets(filters: { status?: string; category?: string } = {}) {
  const staff = await getStaffProfile()
  if (!staff || !staff.libraryId || !staff.branchId) return []

  try {
    const whereClause: any = {
      libraryId: staff.libraryId,
      student: {
        branchId: staff.branchId
      },
      category: { not: 'staff' } // Staff cannot view staff-related issues (handled by owner)
    }

    if (filters.status && filters.status !== 'all') {
      whereClause.status = filters.status
    }
    
    if (filters.category && filters.category !== 'all') {
      whereClause.category = filters.category
    }

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            name: true,
            email: true,
            image: true,
            branchId: true
          }
        },
        staff: {
            select: {
                name: true
            }
        },
        comments: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return tickets
  } catch (error) {
    console.error('Error fetching staff tickets:', error)
    return []
  }
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const owner = await getOwnerProfile()
  const staff = await getStaffProfile()
  
  const libraryId = owner?.libraryId || staff?.libraryId
  
  if (!libraryId) return { success: false, error: 'Unauthorized' }

  try {
    // If staff, ensure ticket belongs to their branch and is not staff-related
    if (staff) {
        const ticket = await prisma.supportTicket.findUnique({
            where: { id: ticketId },
            include: { student: true }
        })
        if (!ticket || ticket.student?.branchId !== staff.branchId || ticket.category === 'staff') {
            return { success: false, error: 'Unauthorized' }
        }
    }

    await prisma.supportTicket.update({
      where: { 
        id: ticketId,
        libraryId // Security check
      },
      data: { status }
    })

    revalidatePath('/owner/issues')
    revalidatePath('/staff/issues')
    return { success: true }
  } catch (error) {
    console.error('Error updating ticket:', error)
    return { success: false, error: 'Failed to update ticket' }
  }
}

export async function getTicketDetails(ticketId: string) {
    const owner = await getOwnerProfile()
    const staff = await getStaffProfile()
    
    const libraryId = owner?.libraryId || staff?.libraryId
    
    if (!libraryId) return null

    try {
        const ticket = await prisma.supportTicket.findUnique({
            where: { 
                id: ticketId,
                libraryId
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        image: true,
                        branchId: true
                    }
                },
                comments: {
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            }
        })

        // If staff, verify branch access and ensure not staff-related
        if (staff && (ticket?.student?.branchId !== staff.branchId || ticket?.category === 'staff')) {
            return null
        }

        return ticket
    } catch (error) {
        console.error('Error fetching ticket details:', error)
        return null
    }
}

export async function getStudentTicketDetails(ticketId: string) {
    const cookieStore = await cookies()
    const studentId = cookieStore.get('student_session')?.value

    if (!studentId) return null

    try {
        const ticket = await prisma.supportTicket.findUnique({
            where: { 
                id: ticketId,
                studentId // Security check: ensure ticket belongs to student
            },
            include: {
                comments: {
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            }
        })
        return ticket
    } catch (error) {
        console.error('Error fetching student ticket details:', error)
        return null
    }
}

export async function addTicketComment(formData: FormData) {
    const content = formData.get('content') as string
    const ticketId = formData.get('ticketId') as string
    
    if (!content || !ticketId) {
        return { success: false, error: 'Missing required fields' }
    }

    // Determine user context (Owner, Staff, or Student)
    const owner = await getOwnerProfile()
    const staff = await getStaffProfile()
    const cookieStore = await cookies()
    const studentId = cookieStore.get('student_session')?.value

    let userId = ''
    let userType = ''
    let libraryId = ''

    if (owner && owner.libraryId) {
        userId = owner.id
        userType = 'owner'
        libraryId = owner.libraryId
    } else if (staff && staff.libraryId) {
        // Verify ticket belongs to staff's branch and is not staff-related
        const ticket = await prisma.supportTicket.findUnique({
            where: { id: ticketId },
            include: { student: true }
        })
        
        if (!ticket || ticket.student?.branchId !== staff.branchId || ticket.category === 'staff') {
            return { success: false, error: 'Unauthorized' }
        }

        userId = staff.id
        userType = 'staff'
        libraryId = staff.libraryId
    } else if (studentId) {
        // Fetch student to get libraryId
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { libraryId: true }
        })
        if (!student || !student.libraryId) return { success: false, error: 'Unauthorized' }
        
        userId = studentId
        userType = 'student'
        libraryId = student.libraryId
    } else {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        await prisma.ticketComment.create({
            data: {
                ticketId,
                userId,
                userType,
                content,
                libraryId
            }
        })

        // If owner or staff comments, update status to 'in_progress' if it was 'open'
        if (userType === 'owner' || userType === 'staff') {
             const ticket = await prisma.supportTicket.findUnique({
                where: { id: ticketId },
                select: { status: true }
             })
             if (ticket?.status === 'open') {
                 await prisma.supportTicket.update({
                     where: { id: ticketId },
                     data: { status: 'in_progress' }
                 })
             }
        }

        // If student comments on a resolved ticket, reopen it
        if (userType === 'student') {
            const ticket = await prisma.supportTicket.findUnique({
               where: { id: ticketId },
               select: { status: true }
            })
            if (ticket?.status === 'resolved') {
                await prisma.supportTicket.update({
                    where: { id: ticketId },
                    data: { status: 'open' }
                })
            }
       }

        revalidatePath(`/student/issues/${ticketId}`)
        revalidatePath(`/owner/issues/${ticketId}`)
        revalidatePath(`/staff/issues/${ticketId}`)
        return { success: true }
    } catch (error) {
        console.error('Error adding comment:', error)
        return { success: false, error: 'Failed to add comment' }
    }
}

export async function reopenTicket(ticketId: string) {
    const cookieStore = await cookies()
    const studentId = cookieStore.get('student_session')?.value

    if (!studentId) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const ticket = await prisma.supportTicket.findUnique({
            where: { 
                id: ticketId,
                studentId 
            },
            include: { student: true } // Need student to get libraryId for comment
        })

        if (!ticket) {
            return { success: false, error: 'Ticket not found' }
        }

        if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
            return { success: false, error: 'Ticket is already active' }
        }

        // Update ticket status to request reopen
        await prisma.supportTicket.update({
            where: { id: ticketId },
            data: { status: 'reopen_requested' }
        })

        // Add system comment
        await prisma.ticketComment.create({
            data: {
                ticketId,
                userId: studentId,
                userType: 'student',
                content: 'Request to reopen ticket sent to admin',
                libraryId: ticket.libraryId
            }
        })

        revalidatePath(`/student/issues/${ticketId}`)
        revalidatePath('/student/issues')
        return { success: true }
    } catch (error) {
        console.error('Error reopening ticket:', error)
        return { success: false, error: 'Failed to reopen ticket' }
    }
}

'use server'

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedOwner } from '@/lib/auth/owner'
import { getOwnerProfile } from '@/actions/owner'
import { getStaffProfile } from '@/actions/staff'
import { getAuthenticatedStudent } from '@/lib/auth/student'
import { getAuthenticatedStaff } from '@/lib/auth/staff'
import { sendAnnouncementEmail } from '@/actions/email'

export async function getOwnerAnnouncements() {
  try {
    const owner = await getAuthenticatedOwner()
    if (!owner) return []

    const announcements = await prisma.announcement.findMany({
      where: { libraryId: owner.libraryId },
      orderBy: { createdAt: 'desc' }
    })
    return announcements
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return []
  }
}

export async function getStudentAnnouncements() {
  try {
    const student = await getAuthenticatedStudent()
    
    if (!student) return []
    const studentId = student.id

    const studentData = await prisma.student.findUnique({
      where: { id: studentId },
      select: { 
        libraryId: true,
        subscriptions: {
          where: { status: 'active' },
          take: 1
        }
      }
    })

    if (!studentData || !studentData.libraryId) return []

    const isActive = studentData.subscriptions.length > 0
    const targetIn = ['all', 'students']
    if (isActive) {
      targetIn.push('active_students')
    }

    const announcements = await prisma.announcement.findMany({
      where: { 
        libraryId: studentData.libraryId,
        target: { in: targetIn },
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    })
    return announcements
  } catch (error) {
    console.error('Error fetching student announcements:', error)
    return []
  }
}

export async function getStaffAnnouncements(
  context?: { libraryId: string; branchId: string | null }
) {
  try {
    let libraryId = context?.libraryId
    let branchId = context?.branchId

    if (!libraryId) {
      const staff = await getAuthenticatedStaff()
      if (!staff || !staff.libraryId) return []
      libraryId = staff.libraryId
      branchId = staff.branchId
    }

    const announcements = await prisma.announcement.findMany({
      where: { 
        libraryId: libraryId,
        AND: [
            {
                OR: [
                    { branchId: null },
                    { branchId: branchId }
                ]
            }
        ],
        target: { in: ['all', 'staff'] },
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    })
    return announcements
  } catch (error) {
    console.error('Error fetching staff announcements:', error)
    return []
  }
}

export async function createAnnouncement(data: {
  title: string
  content: string
  target: string
  branchId?: string | null
  expiresAt?: Date | null
}) {
  try {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    await prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        target: data.target,
        branchId: data.branchId === 'all' ? null : data.branchId,
        expiresAt: data.expiresAt,
        libraryId: owner.libraryId
      }
    })

    // Send emails
    const library = await prisma.library.findUnique({
      where: { id: owner.libraryId },
      select: { name: true }
    })

    if (library) {
      const recipients: { email: string; name: string }[] = []
      const branchFilter = data.branchId && data.branchId !== 'all' 
        ? { branchId: data.branchId } 
        : {}

      // Fetch Students
      if (data.target === 'all' || data.target === 'students' || data.target === 'active_students') {
        const studentWhere: Prisma.StudentWhereInput = { 
          libraryId: owner.libraryId,
          ...branchFilter
        }
        
        if (data.target === 'active_students') {
          studentWhere.subscriptions = { some: { status: 'active' } }
        }

        const students = await prisma.student.findMany({
          where: studentWhere,
          select: { email: true, name: true }
        })
        
        const validStudents = students.filter((s): s is { name: string; email: string } => s.email !== null)
        recipients.push(...validStudents)
      }

      // Fetch Staff
      if (data.target === 'all' || data.target === 'staff') {
        const staff = await prisma.staff.findMany({
          where: { 
            libraryId: owner.libraryId,
            ...branchFilter
          },
          select: { email: true, name: true }
        })
        recipients.push(...staff)
      }

      // Filter out invalid emails and duplicates
      const uniqueRecipients = Array.from(
        new Map(
          recipients
            .filter(r => r.email && r.email.includes('@'))
            .map(item => [item.email, item])
        ).values()
      )

      // Send in parallel (limit concurrency if needed, but for now simple Promise.all)
      // Using Promise.allSettled to prevent one failure from stopping others
      await Promise.allSettled(uniqueRecipients.map(recipient => 
        sendAnnouncementEmail({
          email: recipient.email,
          title: data.title,
          content: data.content,
          libraryName: library.name
        })
      ))
    }
    
    revalidatePath('/owner/marketing')
    revalidatePath('/student/home')
    revalidatePath('/staff/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error creating announcement:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create announcement' }
  }
}

export async function updateAnnouncement(id: string, data: {
  title: string
  content: string
  target: string
  branchId?: string | null
  expiresAt?: Date | null
}) {
  try {
    const owner = await getOwnerProfile()
    if (!owner) return { success: false, error: 'Unauthorized' }

    await prisma.announcement.update({
      where: { id, libraryId: owner.libraryId },
      data: {
        title: data.title,
        content: data.content,
        target: data.target,
        branchId: data.branchId === 'all' ? null : data.branchId,
        expiresAt: data.expiresAt
      }
    })
    
    revalidatePath('/owner/marketing')
    revalidatePath('/student/home')
    revalidatePath('/staff/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error updating announcement:', error)
    return { success: false, error: 'Failed to update announcement' }
  }
}

export async function deleteAnnouncement(id: string) {
  try {
    const owner = await getOwnerProfile()
    if (!owner) return { success: false, error: 'Unauthorized' }

    await prisma.announcement.delete({
      where: { id, libraryId: owner.libraryId }
    })
    
    revalidatePath('/owner/marketing')
    revalidatePath('/student/home')
    revalidatePath('/staff/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error deleting announcement:', error)
    return { success: false, error: 'Failed to delete announcement' }
  }
}

export async function toggleAnnouncementStatus(id: string, isActive: boolean) {
  try {
    const owner = await getOwnerProfile()
    if (!owner) return { success: false, error: 'Unauthorized' }

    await prisma.announcement.update({
      where: { id, libraryId: owner.libraryId },
      data: { isActive }
    })
    
    revalidatePath('/owner/marketing')
    revalidatePath('/student/home')
    revalidatePath('/staff/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error updating announcement:', error)
    return { success: false, error: 'Failed to update announcement' }
  }
}

export async function getUserAnnouncements() {
  try {
    // Check Owner
    const owner = await getOwnerProfile()
    if (owner) return getOwnerAnnouncements()

    // Check Staff
    const staffRes = await getStaffProfile()
    if (staffRes.success && staffRes.data) return getStaffAnnouncements()

    // Check Student
    // getStudentAnnouncements checks cookies internally
    return getStudentAnnouncements()
  } catch (error) {
    console.error('Error fetching user announcements:', error)
    return []
  }
}

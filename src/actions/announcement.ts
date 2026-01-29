'use server'

import { prisma } from '@/lib/prisma'
import { getOwnerProfile } from './owner'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export async function getOwnerAnnouncements() {
  const owner = await getOwnerProfile()
  if (!owner) return []

  try {
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
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_session')?.value
  
  if (!studentId) return []

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { libraryId: true }
    })

    if (!student || !student.libraryId) return []

    const announcements = await prisma.announcement.findMany({
      where: { 
        libraryId: student.libraryId,
        target: { in: ['all_users', 'students'] },
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

export async function getStaffAnnouncements() {
  const cookieStore = await cookies()
  const staffId = cookieStore.get('staff_session')?.value
  
  if (!staffId) return []

  try {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { libraryId: true }
    })

    if (!staff || !staff.libraryId) return []

    const announcements = await prisma.announcement.findMany({
      where: { 
        libraryId: staff.libraryId,
        target: { in: ['all_users', 'staff'] },
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
  type: string
  target: string
  branchId?: string | null
  expiresAt?: Date | null
}) {
  const owner = await getOwnerProfile()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    await prisma.announcement.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type,
        target: data.target,
        branchId: data.branchId === 'all' ? null : data.branchId,
        expiresAt: data.expiresAt,
        libraryId: owner.libraryId
      }
    })
    
    revalidatePath('/owner/marketing')
    revalidatePath('/student/home')
    revalidatePath('/staff/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error creating announcement:', error)
    return { success: false, error: 'Failed to create announcement' }
  }
}

export async function updateAnnouncement(id: string, data: {
  title: string
  content: string
  type: string
  target: string
  branchId?: string | null
  expiresAt?: Date | null
}) {
  const owner = await getOwnerProfile()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    await prisma.announcement.update({
      where: { id, libraryId: owner.libraryId },
      data: {
        title: data.title,
        content: data.content,
        type: data.type,
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
  const owner = await getOwnerProfile()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
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
  const owner = await getOwnerProfile()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
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

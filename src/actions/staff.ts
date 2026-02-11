'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { uploadFile } from './upload'

import { cache } from 'react'

import { staffSchema } from '@/lib/validators/staff'
import { getAuthenticatedStaff } from '@/lib/auth/staff'
import { getAuthenticatedOwner } from '@/lib/auth/owner'

export const getStaffProfile = cache(async function getStaffProfile() {
  try {
    const staff = await getAuthenticatedStaff()
    if (!staff) {
      return { success: false, error: 'Unauthorized' }
    }
    return { success: true, data: staff }
  } catch (error) {
    // Re-throw Next.js dynamic server usage errors so the page can opt-out of static generation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw error
    }
    console.error('Error fetching staff profile:', error)
    return { success: false, error: 'Failed to fetch staff profile' }
  }
})

export async function createStaff(formData: FormData) {
  try {
    const owner = await getAuthenticatedOwner()
    const staff = await getAuthenticatedStaff()

    if (!owner && !staff) {
      return { success: false, error: 'Unauthorized: You must be logged in to create staff' }
    }
    
    const ownerId = owner?.id
    const staffId = staff?.id

    // Extract text fields for validation
    const rawData: Record<string, any> = {}
    formData.forEach((value, key) => {
      if (typeof value === 'string') {
        rawData[key] = value
      }
    })

    const validatedResult = staffSchema.safeParse(rawData)

    if (!validatedResult.success) {
      return { success: false, error: validatedResult.error.issues[0].message }
    }

    const {
      firstName, lastName, email, phone, dob, gender, address,
      role, branchId, salary, employmentType, joiningDate,
      password, username
    } = validatedResult.data
    
    // File uploads
    const idProof = formData.get('idProof') as File
    const resume = formData.get('resume') as File

    // Get Library ID from Branch
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { libraryId: true }
    })

    if (!branch) {
      return { success: false, error: 'Invalid branch selected' }
    }

    const subscription = await prisma.librarySubscription.findUnique({
      where: { libraryId: branch.libraryId },
      include: { plan: true }
    })
    if (!subscription || subscription.status !== 'active') {
      return { success: false, error: 'Platform subscription inactive' }
    }
    const currentStaffCount = await prisma.staff.count({
      where: { libraryId: branch.libraryId }
    })
    if (currentStaffCount >= (subscription.plan.maxStaff || 0)) {
      return { success: false, error: 'Staff limit reached' }
    }

    // Handle file uploads
    const documents = []

    if (idProof && idProof.size > 0) {
      try {
        const url = await uploadFile(idProof)
        if (url) {
          documents.push({
            name: 'ID Proof',
            url: url,
            type: idProof.type,
            size: idProof.size
          })
        }
      } catch (e) {
        console.error('Failed to upload ID Proof', e)
      }
    }

    if (resume && resume.size > 0) {
      try {
        const url = await uploadFile(resume)
        if (url) {
          documents.push({
            name: 'Resume',
            url: url,
            type: resume.type,
            size: resume.size
          })
        }
      } catch (e) {
        console.error('Failed to upload Resume', e)
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Create Staff
    const newStaff = await prisma.staff.create({
      data: {
        libraryId: branch.libraryId,
        branchId,
        name: `${firstName} ${lastName}`,
        email,
        phone,
        dob: dob ? new Date(dob) : null,
        gender,
        address,
        role,
        salary: salary ? parseFloat(salary) : null,
        employmentType,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        username,
        password: hashedPassword,
        documents: documents.length > 0 ? JSON.stringify(documents) : undefined,
        isActive: true,
      }
    })

    // Determine actor
    // cookieStore, ownerId, staffId already defined at top
    
    const performedBy = ownerId 
      ? { type: 'owner', id: ownerId }
      : staffId 
        ? { type: 'staff', id: staffId }
        : { type: 'system', id: 'system' }

    // Log Activity
    await prisma.staffActivity.create({
      data: {
        libraryId: branch.libraryId,
        staffId: newStaff.id,
        type: 'create',
        action: 'Account Created',
        details: 'Staff member account was created',
        entity: 'Staff Management',
        status: 'success',
        metadata: JSON.stringify({ performedBy })
      }
    })

    revalidatePath('/owner/staff')
    return { success: true }
  } catch (error) {
    console.error('Error creating staff:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create staff' }
  }
}

export async function updateStaffProfile(formData: FormData) {
  try {
    const staff = await getAuthenticatedStaff()
    
    if (!staff) {
        return { success: false, error: 'Unauthorized: No session found' }
    }
    const staffId = staff.id

    const id = formData.get('id') as string

    if (!id) {
        return { success: false, error: 'Staff ID is required' }
    }

    if (id !== staffId) {
        return { success: false, error: 'Unauthorized: You can only update your own profile' }
    }

    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const gender = formData.get('gender') as string
    const dob = formData.get('dob') as string
    
    // Handle Image Upload
    const imageFile = formData.get('imageFile') as File | null
    let image = formData.get('image') as string

    if (imageFile && imageFile.size > 0) {
        try {
            const uploadRes = await uploadFile(imageFile)
            if (uploadRes.success && uploadRes.data) {
                image = uploadRes.data
            }
        } catch (e) {
            console.error('Failed to upload profile image', e)
            // Continue without updating image if upload fails? Or return error?
            // Let's log it and continue, maybe keeping old image or null
        }
    }

    if (!id) {
        return { success: false, error: 'Staff ID is required' }
    }

    if (phone && (phone.length !== 10 || !/^\d{10}$/.test(phone))) {
        return { success: false, error: 'Please enter a valid 10-digit phone number' }
    }

    const existingStaff = await prisma.staff.findUnique({ where: { id } })
    if (!existingStaff) {
        return { success: false, error: 'Staff member not found' }
    }

    await prisma.staff.update({
        where: { id },
        data: {
            name,
            phone,
            address,
            gender,
            dob: dob ? new Date(dob) : null,
            image
        }
    })

    revalidatePath('/staff/profile')
    revalidatePath('/staff', 'layout')
    return { success: true }

  } catch (error) {
      console.error('Update staff profile error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update profile' }
  }
}

export async function changeStaffPassword(formData: FormData) {
  try {
    const staff = await getAuthenticatedStaff()
    
    if (!staff) {
        return { success: false, error: 'Unauthorized: No session found' }
    }
    const staffId = staff.id

    const id = formData.get('id') as string

    if (!id) {
        return { success: false, error: 'Staff ID is required' }
    }

    if (id !== staffId) {
        return { success: false, error: 'Unauthorized: You can only change your own password' }
    }

    const currentPassword = formData.get('currentPassword') as string
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!id || !currentPassword || !newPassword || !confirmPassword) {
        return { success: false, error: 'All fields are required' }
    }

    if (newPassword !== confirmPassword) {
        return { success: false, error: 'New passwords do not match' }
    }

    if (newPassword.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' }
    }

    const existingStaff = await prisma.staff.findUnique({ where: { id } })
    if (!existingStaff || !existingStaff.password) {
        return { success: false, error: 'Staff member not found' }
    }

    const isValid = await bcrypt.compare(currentPassword, existingStaff.password)
    if (!isValid) {
        return { success: false, error: 'Incorrect current password' }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.staff.update({
        where: { id },
        data: { password: hashedPassword }
    })

    return { success: true }

  } catch (error) {
      console.error('Change staff password error:', error)
      return { success: false, error: 'Failed to change password' }
  }
}


export async function updateStaff(id: string, formData: FormData) {
  try {
    const owner = await getAuthenticatedOwner()
    const staff = await getAuthenticatedStaff()

    if (!owner && !staff) {
      return { success: false, error: 'Unauthorized: You must be logged in to update staff' }
    }
    
    const ownerId = owner?.id
    const staffId = staff?.id

    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    
    if (!phone || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      return { success: false, error: 'Please enter a valid 10-digit phone number' }
    }

    const dob = formData.get('dob') as string
    const gender = formData.get('gender') as string
    const address = formData.get('address') as string
    const role = formData.get('role') as string
    const branchId = formData.get('branchId') as string
    const salary = formData.get('salary') as string
    const employmentType = formData.get('employmentType') as string
    const joiningDate = formData.get('joiningDate') as string
    const password = formData.get('password') as string
    const usernameInput = (formData.get('username') as string)?.trim()
    const username = usernameInput || null
    const status = formData.get('status') as string
    
    // File uploads
    const idProof = formData.get('idProof') as File
    const resume = formData.get('resume') as File

    // Get Library ID from Branch if branchId is changed (or just always get it to be safe)
    let libraryId = undefined;
    const currentLibraryId = owner?.libraryId || staff?.libraryId

    if (branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { libraryId: true }
      })
      if (branch) {
        if (branch.libraryId !== currentLibraryId) {
             return { success: false, error: 'Invalid branch: Does not belong to your library' }
        }
        libraryId = branch.libraryId
      }
    }

    // Handle file uploads
    
    // Fetch existing documents to append or replace? 
    // For now, let's assume we append new ones or just rely on the fact that we might need a better document management system.
    // The current schema has `documents Json?`.
    // Let's fetch current staff to get existing documents.
    const currentStaff = await prisma.staff.findUnique({ where: { id }, select: { documents: true, password: true, libraryId: true } })
    
    // Define Document interface
    interface Document {
      name: string;
      url: string;
      type: string;
      size: number;
    }
    
    let documents = (currentStaff?.documents as unknown as Document[]) || []

    if (idProof && idProof.size > 0) {
      try {
        const uploadRes = await uploadFile(idProof)
        if (uploadRes.success && uploadRes.data) {
          const url = uploadRes.data
          documents = documents.filter(d => d.name !== 'ID Proof')
          documents.push({
            name: 'ID Proof',
            url: url,
            type: idProof.type,
            size: idProof.size
          })
        }
      } catch (e) {
        console.error('Failed to upload ID Proof', e)
      }
    }

    if (resume && resume.size > 0) {
      try {
        const uploadRes = await uploadFile(resume)
        if (uploadRes.success && uploadRes.data) {
          const url = uploadRes.data
          documents = documents.filter(d => d.name !== 'Resume')
          documents.push({
            name: 'Resume',
            url: url,
            type: resume.type,
            size: resume.size
          })
        }
      } catch (e) {
        console.error('Failed to upload Resume', e)
      }
    }

    let hashedPassword = undefined
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10)
    }

    // Update Staff
    await prisma.staff.update({
      where: { id },
      data: {
        ...(libraryId && { libraryId }),
        branchId,
        name: `${firstName} ${lastName}`,
        email,
        phone,
        dob: dob ? new Date(dob) : null,
        gender,
        address,
        role,
        salary: salary ? parseFloat(salary) : null,
        employmentType,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        username,
        ...(hashedPassword && { password: hashedPassword }),
        documents: documents.length > 0 ? JSON.stringify(documents) : undefined,
        isActive: status !== 'inactive',
        status,
      }
    })

    // Determine actor
    // cookieStore, ownerId, staffId already defined at top
    
    const performedBy = ownerId 
      ? { type: 'owner', id: ownerId }
      : staffId 
        ? { type: 'staff', id: staffId }
        : { type: 'system', id: 'system' }

    // Log Activity
    if (currentStaff) {
      await prisma.staffActivity.create({
        data: {
          libraryId: libraryId || currentStaff.libraryId,
          staffId: id,
          type: 'update',
          action: 'Profile Updated',
          details: 'Staff member profile details were updated',
          entity: 'Staff Management',
          status: 'success',
          metadata: JSON.stringify({ performedBy })
        }
      })
    }

    revalidatePath('/owner/staff')
    revalidatePath(`/owner/staff/${id}`)
    return { success: true }
  } catch (error) {
    console.error('Error updating staff:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update staff' }
  }
}

export async function deleteStaff(id: string) {
  try {
    const owner = await getAuthenticatedOwner()
    
    if (!owner) {
      return { success: false, error: 'Unauthorized: Only owners can delete staff' }
    }

    await prisma.staff.delete({
      where: { id }
    })
    revalidatePath('/owner/staff')
    return { success: true }
  } catch (error) {
    console.error('Error deleting staff:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete staff' }
  }
}

export async function updateStaffImage(staffId: string, formData: FormData) {
  try {
    const owner = await getAuthenticatedOwner()
    const currentStaff = await getAuthenticatedStaff()
    
    const ownerId = owner?.id
    const currentStaffId = currentStaff?.id

    if (!owner && (!currentStaff || currentStaff.id !== staffId)) {
        return { success: false, error: 'Unauthorized' }
    }

    const file = formData.get('image') as File
    if (!file) {
      return { success: false, error: 'No image provided' }
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Invalid file type. Please upload an image.' }
    }

    // Validate file size (e.g., 5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File size exceeds 5MB limit.' }
    }

    // Upload file
    const uploadRes = await uploadFile(file)
    
    if (!uploadRes.success || !uploadRes.data) {
        return { success: false, error: uploadRes.error || 'Failed to upload image' }
    }
    const imageUrl = uploadRes.data

    // Update database
    const updatedStaff = await prisma.staff.update({
      where: { id: staffId },
      data: { image: imageUrl },
      select: { libraryId: true }
    })

    // Log Activity
    // cookieStore, ownerId, currentStaffId already defined at top
    
    const performedBy = ownerId 
      ? { type: 'owner', id: ownerId }
      : currentStaffId 
        ? { type: 'staff', id: currentStaffId }
        : { type: 'system', id: 'system' }

    await prisma.staffActivity.create({
      data: {
        libraryId: updatedStaff.libraryId,
        staffId: staffId,
        type: 'update',
        action: 'Profile Image Updated',
        details: 'Staff member profile picture was updated',
        entity: 'Staff Management',
        status: 'success',
        metadata: JSON.stringify({ performedBy })
      }
    })

    revalidatePath(`/owner/staff/${staffId}`)
    return { success: true, imageUrl }
  } catch (error) {
    console.error('Error updating staff image:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update image' }
  }
}

export async function getStaffDetails(id: string) {
  try {
    const owner = await getAuthenticatedOwner()
    const staff = await getAuthenticatedStaff()
    
    if (!owner && !staff) {
      return { success: false, error: 'Unauthorized' }
    }

    const libraryId = owner?.libraryId || staff?.libraryId

    const targetStaff = await prisma.staff.findUnique({
      where: { id },
      include: {
        branch: true,
      }
    })

    if (!targetStaff || targetStaff.libraryId !== libraryId) {
      return { success: false, error: 'Staff member not found' }
    }

    return { success: true, data: targetStaff }
  } catch (error) {
    console.error('Error fetching staff details:', error)
    return { success: false, error: 'Failed to fetch staff details' }
  }
}

export async function getAllStaff() {
  try {
    const owner = await getAuthenticatedOwner()
    const staff = await getAuthenticatedStaff()
    
    if (!owner && !staff) {
      return { success: false, error: 'Unauthorized' }
    }

    const libraryId = owner?.libraryId || staff?.libraryId

    const allStaff = await prisma.staff.findMany({
      where: { libraryId },
      include: {
        branch: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return { success: true, data: allStaff }
  } catch (error) {
    console.error('Error fetching all staff:', error)
    return { success: false, error: 'Failed to fetch staff list' }
  }
}

export async function getGlobalStaffStats() {
  try {
    const owner = await getAuthenticatedOwner()
    
    if (!owner?.libraryId) {
        return { success: false, error: 'Unauthorized or no library found' }
    }

    const libraryId = owner.libraryId

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalStaff, onLeaveStaff, inactiveStaff, presentToday] = await Promise.all([
      prisma.staff.count({ where: { libraryId } }),
      prisma.staff.count({ where: { libraryId, status: 'on_leave' } }),
      prisma.staff.count({ where: { libraryId, status: 'inactive' } }),
      prisma.staffAttendance.count({
        where: {
          libraryId,
          date: { gte: today },
          status: 'present'
        }
      })
    ])

    return {
      success: true,
      data: {
        totalStaff,
        presentToday,
        onLeave: onLeaveStaff,
        inactive: inactiveStaff
      }
    }
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw error
    }
    console.error('Error fetching global staff stats:', error)
    return { success: false, error: 'Failed to fetch global staff stats' }
  }
}

export async function getStaffAttendance(id: string) {
  try {
    const attendance = await prisma.staffAttendance.findMany({
      where: { staffId: id },
      orderBy: { date: 'desc' },
      take: 30
    })
    return { success: true, data: attendance }
  } catch (error) {
    console.error('Error fetching staff attendance:', error)
    return { success: false, error: 'Failed to fetch staff attendance' }
  }
}

export async function getStaffActivities(id: string) {
  try {
    const activities = await prisma.staffActivity.findMany({
      where: { staffId: id },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    return { success: true, data: activities }
  } catch (error) {
    console.error('Error fetching staff activities:', error)
    return { success: false, error: 'Failed to fetch staff activities' }
  }
}

export async function getStaffStats(id: string) {
  try {
    // This is just a placeholder logic. Real logic would depend on total working days.
    // For now returning mock-like stats but derived if possible.
    // Use id to avoid linter warning
    void id
    return {
      success: true,
      data: {
        attendance: '98%',
        performance: 'Excellent',
        tasksCompleted: 145,
        avgResponseTime: '15 mins'
      }
    }
  } catch (error) {
    console.error('Error fetching staff stats:', error)
    return { success: false, error: 'Failed to fetch staff stats' }
  }
}

export async function getStaffManagementData() {
  try {
    const owner = await getAuthenticatedOwner()
    
    if (!owner?.libraryId) {
      return { success: false, error: 'Unauthorized or no library found' }
    }

    const libraryId = owner.libraryId
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [staff, branches, totalStaff, onLeaveStaff, inactiveStaff, presentToday] = await Promise.all([
      // 1. Get All Staff
      prisma.staff.findMany({
        where: { libraryId },
        include: { branch: true },
        orderBy: { createdAt: 'desc' }
      }),
      // 2. Get All Branches
      prisma.branch.findMany({
        where: { libraryId },
        select: { id: true, name: true }
      }),
      // 3. Stats
      prisma.staff.count({ where: { libraryId } }),
      prisma.staff.count({ where: { libraryId, status: 'on_leave' } }),
      prisma.staff.count({ where: { libraryId, status: 'inactive' } }),
      prisma.staffAttendance.count({
        where: {
          libraryId,
          date: { gte: today },
          status: 'present'
        }
      })
    ])

    return {
      success: true,
      data: {
        staff,
        branches,
        stats: {
          totalStaff,
          presentToday,
          onLeave: onLeaveStaff,
          inactive: inactiveStaff
        }
      }
    }

  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw error
    }
    console.error('Error fetching staff management data:', error)
    return { success: false, error: 'Failed to fetch staff management data' }
  }
}

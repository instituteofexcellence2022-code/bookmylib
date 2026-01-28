'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getOwnerProfile } from './owner'
import { randomUUID } from 'crypto'

export async function getOwnerBranches() {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) return []

  try {
    const branches = await prisma.branch.findMany({
      where: {
        libraryId: owner.libraryId
      },
      include: {
        staff: true,
        seats: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return branches.map(branch => ({
      ...branch,
      seats: { 
        total: branch.seatCount, 
        occupied: branch.seats.filter((s: any) => s.status === 'occupied').length 
      },
      staff: branch.staff.length,
      revenue: 0, 
      amenities: branch.amenities ? JSON.parse(branch.amenities) : [],
      operatingHours: branch.operatingHours ? JSON.parse(branch.operatingHours) : null,
      status: branch.isActive ? 'active' : 'maintenance' // Map boolean to string status
    }))

  } catch (error) {
    console.error('Error fetching branches:', error)
    return []
  }
}

export async function getBranchById(id: string) {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        staff: true,
        seats: true
      }
    })

    if (!branch) return null

    return {
      ...branch,
      seats: { 
        total: branch.seatCount, 
        occupied: branch.seats.filter((s: any) => s.status === 'occupied').length 
      },
      staff: branch.staff.length,
      revenue: 0,
      amenities: branch.amenities ? JSON.parse(branch.amenities) : [],
      operatingHours: branch.operatingHours ? JSON.parse(branch.operatingHours) : null,
      status: branch.isActive ? 'active' : 'maintenance'
    }
  } catch (error) {
    console.error('Error fetching branch:', error)
    return null
  }
}

export async function createBranch(formData: FormData) {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) {
      return { success: false, error: 'Unauthorized' }
  }

  try {
    const name = formData.get('name') as string
    const address = formData.get('address') as string
    const city = formData.get('city') as string
    const state = formData.get('state') as string
    const pincode = formData.get('pincode') as string
    const contactPhone = formData.get('contactPhone') as string
    const amenities = formData.get('amenities') as string 
    const operatingHours = formData.get('operatingHours') as string 
    const status = formData.get('status') as string

    // New fields
    const contactEmail = formData.get('contactEmail') as string
    const managerName = formData.get('managerName') as string
    const seatCount = parseInt(formData.get('seatCount') as string) || 0
    const area = formData.get('area') as string
    const description = formData.get('description') as string
    const mapsLink = formData.get('mapsLink') as string
    const images = formData.get('images') as string
    const wifiDetails = formData.get('wifiDetails') as string

    const branch = await prisma.branch.create({
      data: {
        libraryId: owner.libraryId,
        ownerId: owner.id,
        name,
        address,
        city,
        state,
        pincode,
        contactPhone,
        amenities, 
        operatingHours, 
        isActive: status === 'active',
        contactEmail,
        managerName,
        seatCount,
        area,
        description,
        mapsLink,
        images,
        wifiDetails
      }
    })

    // Auto-generate seats
    if (seatCount > 0) {
      const seats = []
      for (let i = 1; i <= seatCount; i++) {
        seats.push({
          branchId: branch.id,
          libraryId: owner.libraryId,
          number: String(i),
          status: 'available',
          type: 'standard',
          section: 'General'
        })
      }
      
      // Use loop for SQLite compatibility
      await prisma.$transaction(
        seats.map(seat => prisma.seat.create({ data: seat }))
      )
    }

    revalidatePath('/owner/branches')
    return { success: true }
  } catch (error) {
    console.error('Error creating branch:', error)
    return { success: false, error: 'Failed to create branch' }
  }
}

export async function updateBranch(formData: FormData) {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) {
      return { success: false, error: 'Unauthorized' }
  }

  try {
    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const address = formData.get('address') as string
    const city = formData.get('city') as string
    const state = formData.get('state') as string
    const pincode = formData.get('pincode') as string
    const contactPhone = formData.get('contactPhone') as string
    const amenities = formData.get('amenities') as string 
    const operatingHours = formData.get('operatingHours') as string
    const status = formData.get('status') as string

    // New fields
    const contactEmail = formData.get('contactEmail') as string
    const managerName = formData.get('managerName') as string
    const seatCount = parseInt(formData.get('seatCount') as string) || 0
    const area = formData.get('area') as string
    const description = formData.get('description') as string
    const mapsLink = formData.get('mapsLink') as string
    const images = formData.get('images') as string
    const wifiDetails = formData.get('wifiDetails') as string

    await prisma.branch.update({
      where: { id },
      data: {
        name,
        address,
        city,
        state,
        pincode,
        contactPhone,
        amenities,
        operatingHours,
        isActive: status === 'active',
        contactEmail,
        managerName,
        seatCount,
        area,
        description,
        mapsLink,
        images,
        wifiDetails
      }
    })

    revalidatePath('/owner/branches')
    revalidatePath(`/owner/branches/${id}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error updating branch:', error)
    return { success: false, error: error.message || 'Failed to update branch' }
  }
}

export async function deleteBranch(id: string) {
    const owner = await getOwnerProfile()
    if (!owner) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        await prisma.branch.delete({
            where: { id }
        })
        revalidatePath('/owner/branches')
        return { success: true }
    } catch (error) {
        console.error('Error deleting branch:', error)
        return { success: false, error: 'Failed to delete branch' }
    }
}

export async function generateBranchQR(branchId: string) {
    const owner = await getOwnerProfile()
    if (!owner) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const qrCode = randomUUID()
        await prisma.branch.update({
            where: { id: branchId },
            data: { qrCode }
        })

        revalidatePath('/owner/branches')
        return { success: true, qrCode }
    } catch (error) {
        console.error('Error generating QR:', error)
        return { success: false, error: 'Failed to generate QR' }
    }
}

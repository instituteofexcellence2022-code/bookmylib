'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { uploadFile } from '@/actions/upload'
import { prisma } from '@/lib/prisma'
import { getOwnerProfile } from './owner'

// Helper for safe JSON parsing
const safeParse = <T>(jsonString: string | null, fallback: T): T => {
  if (!jsonString) return fallback
  try {
    return JSON.parse(jsonString)
  } catch {
    return fallback
  }
}

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
        seats: {
          include: {
            subscriptions: {
              where: {
                status: 'active',
                endDate: { gt: new Date() }
              }
            }
          }
        },
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return branches.map(branch => ({
      ...branch,
      seats: { 
        total: branch.seatCount, 
        occupied: branch.seats.filter((s) => s.subscriptions.length > 0).length 
      },
      staff: branch.staff.length,
      revenue: 0, 
      amenities: safeParse(branch.amenities, []),
      operatingHours: branch.operatingHours,
      libraryRules: branch.libraryRules || [],
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
        owner: true,
        seats: {
          include: {
            subscriptions: {
              where: {
                status: 'active',
                endDate: { gt: new Date() }
              }
            }
          }
        }
      }
    })

    if (!branch) return null

    // Calculate revenue metrics
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const [totalRevenueAgg, thisMonthRevenueAgg, lastMonthRevenueAgg, recentPayments] = await Promise.all([
      // Total Revenue
      prisma.payment.aggregate({
        where: { branchId: id, status: 'completed' },
        _sum: { amount: true }
      }),
      // This Month Revenue
      prisma.payment.aggregate({
        where: { 
          branchId: id, 
          status: 'completed',
          date: { gte: startOfMonth }
        },
        _sum: { amount: true }
      }),
      // Last Month Revenue
      prisma.payment.aggregate({
        where: { 
          branchId: id, 
          status: 'completed',
          date: { gte: startOfLastMonth, lte: endOfLastMonth }
        },
        _sum: { amount: true }
      }),
      // Recent Payments for Chart
      prisma.payment.findMany({
        where: {
          branchId: id,
          status: 'completed',
          date: { gte: ninetyDaysAgo }
        },
        select: { amount: true, date: true },
        orderBy: { date: 'asc' }
      })
    ])
 
     // Process payments into daily totals
     const dailyRevenue = new Map<string, number>()
     recentPayments.forEach(payment => {
       const dateKey = payment.date.toISOString().split('T')[0]
       dailyRevenue.set(dateKey, (dailyRevenue.get(dateKey) || 0) + payment.amount)
     })
 
     // Convert to array format for Recharts
     const revenueData = Array.from(dailyRevenue.entries()).map(([date, amount]) => ({
       date,
       amount
     })).sort((a, b) => a.date.localeCompare(b.date))
 
     return {
       ...branch,
       seats: { 
         total: branch.seatCount, 
         occupied: branch.seats.filter((s) => s.subscriptions.length > 0).length 
       },
       staffCount: branch.staff.length,
       staffList: branch.staff,
       revenue: totalRevenueAgg._sum.amount || 0,
       monthlyRevenue: thisMonthRevenueAgg._sum.amount || 0,
       lastMonthRevenue: lastMonthRevenueAgg._sum.amount || 0,
      revenueData,
      amenities: safeParse(branch.amenities, []),
      operatingHours: branch.operatingHours,
      libraryRules: branch.libraryRules || [],
      status: branch.isActive ? 'active' : 'maintenance'
    }
  } catch (error) {
    if ((error as { digest?: string })?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw error
    }
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
    const district = formData.get('district') as string
    const state = formData.get('state') as string
    const pincode = formData.get('pincode') as string
    const contactPhone = formData.get('contactPhone') as string
    const amenities = formData.get('amenities') as string 
    
    const operatingHoursStr = formData.get('operatingHours') as string 
    const operatingHours = operatingHoursStr ? JSON.parse(operatingHoursStr) : null

    const status = formData.get('status') as string
    
    const libraryRulesStr = formData.get('libraryRules') as string
    const libraryRules = libraryRulesStr ? JSON.parse(libraryRulesStr) : []

    // New fields
    const contactEmail = formData.get('contactEmail') as string
    const managerName = formData.get('managerName') as string
    const seatCount = parseInt(formData.get('seatCount') as string) || 0
    const area = formData.get('area') as string
    const description = formData.get('description') as string
    const mapsLink = formData.get('mapsLink') as string
    const latitude = formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : null
    const longitude = formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : null
    
    const wifiDetailsStr = formData.get('wifiDetails') as string
    const wifiDetails = wifiDetailsStr ? JSON.parse(wifiDetailsStr) : []
    
    const upiId = formData.get('upiId') as string
    const payeeName = formData.get('payeeName') as string

    // Validate UPI ID if provided
    if (upiId && !/^[\w.-]+@[\w.-]+$/.test(upiId)) {
      return { success: false, error: 'Invalid UPI ID format (e.g. username@bank)' }
    }

    // Validate UPI ID if provided
    if (upiId && !/^[\w.-]+@[\w.-]+$/.test(upiId)) {
      return { success: false, error: 'Invalid UPI ID format (e.g. username@bank)' }
    }

    console.log('Creating branch:', { name, libraryRules })

    // Handle Image Uploads
    const imageFiles = formData.getAll('imageFiles') as File[]
    const uploadedUrls: string[] = []

    for (const file of imageFiles) {
      if (file && file.size > 0) {
        try {
          const url = await uploadFile(file)
          if (url) uploadedUrls.push(url)
        } catch (e) {
          console.error('Failed to upload branch image:', e)
        }
      }
    }

    const images = JSON.stringify(uploadedUrls)

    const branch = await prisma.branch.create({
      data: {
        libraryId: owner.libraryId,
        ownerId: owner.id,
        name,
        address,
        city,
        district,
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
        latitude,
        longitude,
        images,
        wifiDetails,
        libraryRules,
        upiId,
        payeeName
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
          type: 'regular',
          section: 'General'
        })
      }
      
      // Use loop for SQLite compatibility
      await prisma.$transaction(
        seats.map(seat => prisma.seat.create({ data: seat }))
      )
    }

    revalidatePath('/owner/branches')
    revalidatePath(`/owner/branches/${branch.id}`)
    revalidatePath(`/student/book/${branch.id}`)
    revalidatePath('/student/book')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error creating branch:', error)
    const message = error instanceof Error ? error.message : 'Failed to create branch'
    return { success: false, error: message }
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
    const district = formData.get('district') as string
    const state = formData.get('state') as string
    const pincode = formData.get('pincode') as string
    const contactPhone = formData.get('contactPhone') as string
    const amenities = formData.get('amenities') as string 
    
    const operatingHoursStr = formData.get('operatingHours') as string
    const operatingHours = operatingHoursStr ? JSON.parse(operatingHoursStr) : null

    const status = formData.get('status') as string
    
    const libraryRulesStr = formData.get('libraryRules') as string
    const libraryRules = libraryRulesStr ? JSON.parse(libraryRulesStr) : []

    // New fields
    const contactEmail = formData.get('contactEmail') as string
    const managerName = formData.get('managerName') as string
    const seatCount = parseInt(formData.get('seatCount') as string) || 0
    const area = formData.get('area') as string
    const description = formData.get('description') as string
    console.log('Updating branch:', { id, description, libraryRules: formData.get('libraryRules') })
    const mapsLink = formData.get('mapsLink') as string
    const latitude = formData.get('latitude') ? parseFloat(formData.get('latitude') as string) : null
    const longitude = formData.get('longitude') ? parseFloat(formData.get('longitude') as string) : null
    
    const wifiDetailsStr = formData.get('wifiDetails') as string
    const wifiDetails = wifiDetailsStr ? JSON.parse(wifiDetailsStr) : []
    
    const upiId = formData.get('upiId') as string
    const payeeName = formData.get('payeeName') as string

    // Validate UPI ID if provided
    if (upiId && !/^[\w.-]+@[\w.-]+$/.test(upiId)) {
      return { success: false, error: 'Invalid UPI ID format (e.g. username@bank)' }
    }

    // Handle Image Uploads
    const existingImagesRaw = formData.get('existingImages') as string
    let existingImages: string[] = []
    try {
      existingImages = existingImagesRaw ? JSON.parse(existingImagesRaw) : []
    } catch {
      existingImages = []
    }

    const imageFiles = formData.getAll('imageFiles') as File[]
    const newUrls: string[] = []

    for (const file of imageFiles) {
      if (file && file.size > 0) {
        try {
          const url = await uploadFile(file)
          if (url) newUrls.push(url)
        } catch (e) {
          console.error('Failed to upload branch image:', e)
        }
      }
    }

    const images = JSON.stringify([...existingImages, ...newUrls])

    // Verify ownership
    const existingBranch = await prisma.branch.findUnique({ where: { id } })
    if (!existingBranch || existingBranch.libraryId !== owner.libraryId) {
      return { success: false, error: 'Unauthorized: Branch does not belong to your library' }
    }

    await prisma.branch.update({
      where: { id },
      data: {
        name,
        address,
        city,
        district,
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
        latitude,
        longitude,
        images,
        wifiDetails,
        libraryRules,
        upiId,
        payeeName
      }
    })

    revalidatePath('/owner/branches')
    revalidatePath(`/owner/branches/${id}`)
    revalidatePath('/student/book')
    revalidatePath(`/student/book/${id}`)
    revalidatePath(`/student/book/${id}/details`)
    return { success: true }
  } catch (error: unknown) {
    console.error('Error updating branch:', error)
    const message = error instanceof Error ? error.message : 'Failed to update branch'
    return { success: false, error: message }
  }
}

export async function deleteBranch(id: string) {
    const owner = await getOwnerProfile()
    if (!owner || !owner.libraryId) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const branch = await prisma.branch.findUnique({ where: { id } })
        if (!branch || branch.libraryId !== owner.libraryId) {
            return { success: false, error: 'Unauthorized' }
        }

        await prisma.branch.delete({
            where: { id }
        })
        revalidatePath('/owner/branches')
        return { success: true }
    } catch (error: unknown) {
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
        const branch = await prisma.branch.findUnique({ where: { id: branchId } })
        if (!branch || branch.libraryId !== owner.libraryId) {
            return { success: false, error: 'Unauthorized' }
        }

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

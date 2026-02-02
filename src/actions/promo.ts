'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getOwnerProfile } from './owner'

export async function getOwnerPromotions() {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) return []

  try {
    const promotions = await prisma.promotion.findMany({
      where: {
        libraryId: owner.libraryId
      },
      include: {
        branch: {
          select: { name: true }
        },
        plan: {
          select: { name: true }
        },
        _count: {
          select: { payments: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Map database fields to frontend expected fields
    return promotions.map(p => ({
      ...p,
      usedCount: p._count.payments,
      type: p.type,
      value: p.value || 0, // Handle optional value
      duration: p.duration,
      durationUnit: p.durationUnit,
      validFrom: p.startDate,
      validTo: p.endDate,
      minOrder: p.minOrderValue
    }))
  } catch (error) {
    console.error('Error fetching promotions:', error)
    return []
  }
}

export async function createPromotion(formData: FormData) {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) return { success: false, error: 'Unauthorized' }

  try {
    const code = formData.get('code') as string
    const description = formData.get('description') as string
    const type = formData.get('type') as string
    
    // Handle value based on type
    const valueRaw = formData.get('value') as string
    const value = valueRaw ? parseFloat(valueRaw) : null
    
    // Handle duration for free_trial
    const durationRaw = formData.get('duration') as string
    const duration = durationRaw ? parseInt(durationRaw) : null
    const durationUnit = formData.get('durationUnit') as string || null

    const validFrom = new Date(formData.get('validFrom') as string)
    const validTo = new Date(formData.get('validTo') as string)
    const usageLimit = formData.get('usageLimit') ? parseInt(formData.get('usageLimit') as string) : null
    const perUserLimit = formData.get('perUserLimit') ? parseInt(formData.get('perUserLimit') as string) : null
    const minOrder = formData.get('minOrder') ? parseFloat(formData.get('minOrder') as string) : null
    const maxDiscountRaw = formData.get('maxDiscount') as string
    const maxDiscount = maxDiscountRaw ? parseFloat(maxDiscountRaw) : null
    const branchId = formData.get('branchId') as string || null
    const planId = formData.get('planId') as string || null

    // Validation
    if (!code) return { success: false, error: 'Code is required' }
    
    if (type === 'free_trial') {
        if (!duration || duration <= 0) return { success: false, error: 'Duration is required for free trial' }
        if (!durationUnit) return { success: false, error: 'Duration unit is required for free trial' }
    } else {
        if (value === null || isNaN(value) || value < 0) return { success: false, error: 'Invalid value' }
        if (type === 'percentage' && value > 100) return { success: false, error: 'Percentage cannot exceed 100%' }
    }
    
    if (validTo < validFrom) return { success: false, error: 'End date cannot be before start date' }

    // Unique Code Check
    const normalizedCode = code.toUpperCase()
    const existing = await prisma.promotion.findFirst({
      where: {
        libraryId: owner.libraryId,
        code: normalizedCode
      }
    })
    if (existing) return { success: false, error: 'Promotion code already exists' }

    await prisma.promotion.create({
      data: {
        libraryId: owner.libraryId,
        code: normalizedCode,
        description,
        type,
        value,
        duration,
        durationUnit,
        startDate: validFrom,
        endDate: validTo,
        usageLimit,
        perUserLimit,
        minOrderValue: minOrder,
        maxDiscount,
        branchId: branchId === 'all' ? null : branchId,
        planId: planId === 'all' ? null : planId,
      }
    })

    revalidatePath('/owner/promos')
    return { success: true }
  } catch (error: any) {
    console.error('Detailed error creating promotion:', error)
    if (error.code === 'P2002') {
      return { success: false, error: 'Promotion code already exists' }
    }
    return { success: false, error: `Failed to create promotion: ${error.message || 'Unknown error'}` }
  }
}

export async function updatePromotion(formData: FormData) {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) return { success: false, error: 'Unauthorized' }

  try {
    const id = formData.get('id') as string
    const code = formData.get('code') as string
    const description = formData.get('description') as string
    const type = formData.get('type') as string
    
    const valueRaw = formData.get('value') as string
    const value = valueRaw ? parseFloat(valueRaw) : null

    const durationRaw = formData.get('duration') as string
    const duration = durationRaw ? parseInt(durationRaw) : null
    const durationUnit = formData.get('durationUnit') as string || null

    const validFrom = new Date(formData.get('validFrom') as string)
    const validTo = new Date(formData.get('validTo') as string)
    const usageLimit = formData.get('usageLimit') ? parseInt(formData.get('usageLimit') as string) : null
    const perUserLimit = formData.get('perUserLimit') ? parseInt(formData.get('perUserLimit') as string) : null
    const minOrder = formData.get('minOrder') ? parseFloat(formData.get('minOrder') as string) : null
    const maxDiscountRaw = formData.get('maxDiscount') as string
    const maxDiscount = maxDiscountRaw ? parseFloat(maxDiscountRaw) : null
    const branchId = formData.get('branchId') as string || null
    const planId = formData.get('planId') as string || null
    const isActive = formData.get('isActive') === 'true'

    // Validation
    if (!code) return { success: false, error: 'Code is required' }
    
    if (type === 'free_trial') {
        if (!duration || duration <= 0) return { success: false, error: 'Duration is required for free trial' }
        if (!durationUnit) return { success: false, error: 'Duration unit is required for free trial' }
    } else {
        if (value === null || isNaN(value) || value < 0) return { success: false, error: 'Invalid value' }
        if (type === 'percentage' && value > 100) return { success: false, error: 'Percentage cannot exceed 100%' }
    }

    if (validTo < validFrom) return { success: false, error: 'End date cannot be before start date' }

    // Unique Code Check (excluding current promo)
    const existing = await prisma.promotion.findFirst({
      where: {
        libraryId: owner.libraryId,
        code: code,
        NOT: { id }
      }
    })
    if (existing) return { success: false, error: 'Promotion code already exists' }

    await prisma.promotion.update({
      where: { id },
      data: {
        code,
        description,
        type,
        value,
        duration,
        durationUnit,
        startDate: validFrom,
        endDate: validTo,
        usageLimit,
        perUserLimit,
        minOrderValue: minOrder,
        maxDiscount,
        branchId: branchId === 'all' ? null : branchId,
        planId: planId === 'all' ? null : planId,
        isActive
      }
    })

    revalidatePath('/owner/promos')
    return { success: true }
  } catch (error: any) {
    console.error('Error updating promotion:', error)
    if (error.code === 'P2002') {
      return { success: false, error: 'Promotion code already exists' }
    }
    return { success: false, error: 'Failed to update promotion' }
  }
}

export async function deletePromotion(id: string) {
  const owner = await getOwnerProfile()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    await prisma.promotion.delete({
      where: { id }
    })
    revalidatePath('/owner/promos')
    return { success: true }
  } catch (error) {
    console.error('Error deleting promotion:', error)
    return { success: false, error: 'Failed to delete promotion' }
  }
}

export async function togglePromotionStatus(id: string) {
  try {
    const promo = await prisma.promotion.findUnique({ where: { id } })
    if (!promo) return { success: false, error: 'Promotion not found' }

    await prisma.promotion.update({
      where: { id },
      data: { isActive: !promo.isActive }
    })
    revalidatePath('/owner/promos')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to update status' }
  }
}

export async function getOwnerReferrals() {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) return []

  try {
    const referrals = await prisma.referral.findMany({
      where: {
        libraryId: owner.libraryId
      },
      include: {
        referrer: {
          select: { name: true, email: true, phone: true }
        },
        referee: {
          select: { name: true, email: true, phone: true, branchId: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return referrals
  } catch (error) {
    console.error('Error fetching referrals:', error)
    return []
  }
}

export async function saveReferralSettings(settings: any) {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) return { success: false, error: 'Unauthorized' }

  try {
    await prisma.library.update({
      where: { id: owner.libraryId },
      data: { referralSettings: settings }
    })
    revalidatePath('/owner/promos')
    return { success: true }
  } catch (error) {
    console.error('Error saving referral settings:', error)
    return { success: false, error: 'Failed to save settings' }
  }
}

export async function getReferralSettings() {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) return null

  try {
    const library = await prisma.library.findUnique({
      where: { id: owner.libraryId },
      select: { referralSettings: true }
    })
    return library?.referralSettings
  } catch (error) {
    console.error('Error fetching referral settings:', error)
    return null
  }
}

export async function getBranchOffers(branchId: string) {
  try {
    // Get branch to find libraryId
    const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { libraryId: true }
    })
    
    if (!branch) return []

    const today = new Date()

    const promotions = await prisma.promotion.findMany({
      where: {
        libraryId: branch.libraryId,
        isActive: true,
        OR: [
          { branchId: branchId },
          { branchId: null } // Global library offers
        ],
        AND: [
            {
                OR: [
                    { startDate: { lte: today } },
                    { startDate: null }
                ]
            },
            {
                OR: [
                    { endDate: { gte: today } },
                    { endDate: null }
                ]
            }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Convert Decimal/Date types to plain objects if necessary, though server actions usually handle this.
    // However, explicit mapping is safer for client components.
    return promotions.map(p => ({
        ...p,
        value: p.value || 0,
        startDate: p.startDate?.toISOString() || null,
        endDate: p.endDate?.toISOString() || null,
        createdAt: p.createdAt.toISOString()
    }))
  } catch (error) {
    console.error('Error fetching branch offers:', error)
    return []
  }
}

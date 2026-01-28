'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getOwnerProfile } from './owner'

export async function getOwnerPlans() {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) return []

  try {
    const plans = await prisma.plan.findMany({
      where: {
        libraryId: owner.libraryId
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return plans
  } catch (error) {
    console.error('Error fetching plans:', error)
    return []
  }
}

export async function getPlanById(id: string) {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) return null

  try {
    const plan = await prisma.plan.findFirst({
      where: {
        id,
        libraryId: owner.libraryId
      }
    })
    return plan
  } catch (error) {
    console.error('Error fetching plan:', error)
    return null
  }
}

export async function createPlan(formData: FormData) {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const name = formData.get('name') as string
    const description = formData.get('description') as string | null
    const priceRaw = formData.get('price') as string
    const durationRaw = formData.get('duration') as string
    const durationUnit = formData.get('durationUnit') as string
    const category = formData.get('category') as string
    const billingCycle = formData.get('billingCycle') as string
    const status = (formData.get('status') as string) || 'active'
    
    // Optional fields
    const branchId = formData.get('branchId') as string | null
    const hoursPerDayRaw = formData.get('hoursPerDay') as string | null
    const shiftStart = formData.get('shiftStart') as string | null
    const shiftEnd = formData.get('shiftEnd') as string | null

    if (!name || !priceRaw || !durationRaw || !category || !durationUnit || !billingCycle) {
      return { success: false, error: 'All required fields must be provided' }
    }

    const price = parseFloat(priceRaw)
    const duration = parseInt(durationRaw, 10)

    if (isNaN(price) || price < 0) {
      return { success: false, error: 'Please enter a valid price' }
    }

    if (isNaN(duration) || duration <= 0) {
      return { success: false, error: 'Please enter a valid duration' }
    }

    let hoursPerDay: number | null = null
    if (category === 'flexible') {
      if (!hoursPerDayRaw) {
        return { success: false, error: 'Please specify hours per day for flexible plan' }
      }
      const parsedHours = parseFloat(hoursPerDayRaw)
      if (isNaN(parsedHours) || parsedHours <= 0) {
        return { success: false, error: 'Please enter a valid hours per day value' }
      }
      hoursPerDay = parsedHours
    }

    if (category === 'fixed') {
      if (!shiftStart || !shiftEnd) {
        return { success: false, error: 'Please specify shift timings for fixed plan' }
      }
    }

    const plan = await prisma.plan.create({
      data: {
        libraryId: owner.libraryId,
        name,
        description: description && description.trim().length > 0 ? description : null,
        price,
        duration,
        durationUnit,
        category,
        billingCycle,
        branchId: branchId && branchId !== 'all' ? branchId : null,
        hoursPerDay,
        shiftStart: category === 'fixed' ? shiftStart : null,
        shiftEnd: category === 'fixed' ? shiftEnd : null,
        isActive: status === 'active'
      }
    })

    revalidatePath('/owner/plans')
    return { success: true, planId: plan.id }
  } catch (error) {
    console.error('Error creating plan:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create plan' }
  }
}

export async function updatePlan(formData: FormData) {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const id = formData.get('id') as string
    if (!id) {
      return { success: false, error: 'Plan id is required' }
    }

    const name = formData.get('name') as string | null
    const description = formData.get('description') as string | null
    const priceRaw = formData.get('price') as string | null
    const durationRaw = formData.get('duration') as string | null
    const durationUnit = formData.get('durationUnit') as string | null
    const category = formData.get('category') as string | null
    const billingCycle = formData.get('billingCycle') as string | null
    const status = formData.get('status') as string | null
    const branchId = formData.get('branchId') as string | null
    
    const hoursPerDayRaw = formData.get('hoursPerDay') as string | null
    const shiftStart = formData.get('shiftStart') as string | null
    const shiftEnd = formData.get('shiftEnd') as string | null

    const data: any = {}

    if (name !== null) data.name = name
    if (description !== null) data.description = description && description.trim().length > 0 ? description : null
    
    if (priceRaw !== null) {
      const price = parseFloat(priceRaw)
      if (isNaN(price) || price < 0) return { success: false, error: 'Please enter a valid price' }
      data.price = price
    }

    if (durationRaw !== null) {
      const duration = parseInt(durationRaw, 10)
      if (isNaN(duration) || duration <= 0) return { success: false, error: 'Please enter a valid duration' }
      data.duration = duration
    }

    if (durationUnit !== null) data.durationUnit = durationUnit
    if (billingCycle !== null) data.billingCycle = billingCycle
    if (branchId !== null) data.branchId = branchId === 'all' ? null : branchId
    
    if (category !== null) {
      data.category = category

      if (category === 'flexible') {
        if (!hoursPerDayRaw) {
          return { success: false, error: 'Please specify hours per day for flexible plan' }
        }
        const parsedHours = parseFloat(hoursPerDayRaw)
        if (isNaN(parsedHours) || parsedHours <= 0) {
          return { success: false, error: 'Please enter a valid hours per day value' }
        }
        data.hoursPerDay = parsedHours
        data.shiftStart = null
        data.shiftEnd = null
      } else if (category === 'fixed') {
        if (!shiftStart || !shiftEnd) {
          return { success: false, error: 'Please specify shift timings for fixed plan' }
        }
        data.shiftStart = shiftStart
        data.shiftEnd = shiftEnd
        data.hoursPerDay = null
      }
    } else {
      if (hoursPerDayRaw !== null) {
        if (!hoursPerDayRaw) {
          data.hoursPerDay = null
        } else {
          const parsedHours = parseFloat(hoursPerDayRaw)
          if (isNaN(parsedHours) || parsedHours <= 0) {
            return { success: false, error: 'Please enter a valid hours per day value' }
          }
          data.hoursPerDay = parsedHours
        }
      }

      if (shiftStart !== null) {
        data.shiftStart = shiftStart || null
      }
      if (shiftEnd !== null) {
        data.shiftEnd = shiftEnd || null
      }
    }

    if (status !== null) {
      data.isActive = status === 'active'
    }

    await prisma.plan.update({
      where: {
        id
      },
      data
    })

    revalidatePath('/owner/plans')
    revalidatePath(`/owner/plans/${id}`)
    return { success: true }
  } catch (error) {
    console.error('Error updating plan:', error)
    return { success: false, error: 'Failed to update plan' }
  }
}

export async function deletePlan(id: string) {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    await prisma.plan.delete({
      where: {
        id
      }
    })
    revalidatePath('/owner/plans')
    return { success: true }
  } catch (error) {
    console.error('Error deleting plan:', error)
    return { success: false, error: 'Failed to delete plan' }
  }
}

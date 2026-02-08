'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getOwnerProfile } from './owner'

export async function getOwnerFees() {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) return []

  try {
    const fees = await prisma.additionalFee.findMany({
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
    return fees
  } catch (error) {
    console.error('Error fetching fees:', error)
    return []
  }
}

export async function createFee(formData: FormData) {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const name = formData.get('name') as string
    const amountRaw = formData.get('amount') as string
    const billType = formData.get('billType') as string || 'ONE_TIME'
    const description = formData.get('description') as string | null
    const branchId = formData.get('branchId') as string | null

    if (!name || !amountRaw) {
      return { success: false, error: 'All required fields must be provided' }
    }

    const amount = parseFloat(amountRaw)
    if (isNaN(amount) || amount < 0) {
      return { success: false, error: 'Please enter a valid amount' }
    }

    await prisma.additionalFee.create({
      data: {
        libraryId: owner.libraryId,
        name,
        amount,
        billType,
        description,
        branchId: branchId && branchId !== 'all' ? branchId : null,
        isActive: true
      }
    })

    revalidatePath('/owner/plans')
    return { success: true }
  } catch (error: any) {
    console.error('Error creating fee:', error)
    return { success: false, error: error.message || 'Failed to create fee' }
  }
}

export async function updateFee(formData: FormData) {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const id = formData.get('id') as string
    if (!id) return { success: false, error: 'Fee ID is required' }

    // If status update
    const status = formData.get('status')
    if (status) {
      await prisma.additionalFee.update({
        where: { id, libraryId: owner.libraryId },
        data: { isActive: status === 'active' }
      })
      revalidatePath('/owner/plans')
      return { success: true }
    }

    // If full update
    const name = formData.get('name') as string
    const amountRaw = formData.get('amount') as string
    const billType = formData.get('billType') as string || 'ONE_TIME'
    const description = formData.get('description') as string | null
    const branchId = formData.get('branchId') as string | null

    if (!name || !amountRaw) {
      return { success: false, error: 'All required fields must be provided' }
    }

    const amount = parseFloat(amountRaw)
    if (isNaN(amount) || amount < 0) {
      return { success: false, error: 'Please enter a valid amount' }
    }

    await prisma.additionalFee.update({
      where: { id, libraryId: owner.libraryId },
      data: {
        name,
        amount,
        billType,
        description,
        branchId: branchId && branchId !== 'all' ? branchId : null
      }
    })

    revalidatePath('/owner/plans')
    return { success: true }
  } catch (error) {
    console.error('Error updating fee:', error)
    return { success: false, error: 'Failed to update fee' }
  }
}

export async function deleteFee(id: string) {
  const owner = await getOwnerProfile()
  if (!owner || !owner.libraryId) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    await prisma.additionalFee.delete({
      where: { id, libraryId: owner.libraryId }
    })

    revalidatePath('/owner/plans')
    return { success: true }
  } catch (error) {
    console.error('Error deleting fee:', error)
    return { success: false, error: 'Failed to delete fee' }
  }
}

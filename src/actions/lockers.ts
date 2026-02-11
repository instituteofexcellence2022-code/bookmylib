 'use server'
 
 import { prisma } from '@/lib/prisma'
 
 export type SimpleLocker = {
   id: string
   number: string
   section: string | null
  type: string | null
   isActive: boolean
   isOccupied: boolean
  libraryId: string
  branchId: string
 }
 
 export async function getBranchLockersSimple(branchId: string): Promise<{ success: boolean; data?: SimpleLocker[]; error?: string }> {
   try {
     const lockers = await prisma.locker.findMany({
       where: { branchId },
       include: {
         _count: {
           select: {
             subscriptions: {
               where: {
                 status: 'active',
                 endDate: { gt: new Date() }
               }
             }
           }
         }
       },
       orderBy: { number: 'asc' }
     })
 
    const data: SimpleLocker[] = lockers.map(l => ({
       id: l.id,
       number: l.number,
       section: l.section,
       type: l.type,
       isActive: l.isActive,
      isOccupied: l._count.subscriptions > 0,
      libraryId: l.libraryId,
      branchId: l.branchId
     }))
 
     return { success: true, data }
   } catch (error) {
     console.error('Error fetching simple lockers:', error)
     return { success: false, error: 'Failed to fetch lockers' }
   }
 }
 
 export async function isLockerAvailable(lockerId: string, start: Date, end: Date): Promise<{ available: boolean; conflictId?: string }> {
   try {
     const conflicting = await prisma.studentSubscription.findFirst({
       where: {
         lockerId,
         status: { in: ['active', 'pending'] },
        startDate: { lte: end },
        endDate: { gte: start }
       },
       select: { id: true }
     })
     if (conflicting) {
       return { available: false, conflictId: conflicting.id }
     }
     return { available: true }
   } catch (error) {
     console.error('Error checking locker availability:', error)
     return { available: false }
   }
 }
 
 export async function findLockerBySeatNumber(branchId: string, seatNumber: string): Promise<{ success: boolean; id?: string; error?: string }> {
   try {
     const locker = await prisma.locker.findFirst({
       where: {
         branchId,
         number: seatNumber
       },
       select: { id: true }
     })
     if (!locker) return { success: false, error: 'Locker not found' }
     return { success: true, id: locker.id }
   } catch (error) {
     console.error('Error finding locker by seat number:', error)
     return { success: false, error: 'Failed to find locker' }
   }
 }

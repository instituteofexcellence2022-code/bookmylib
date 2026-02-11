 'use server'
 
 import { prisma } from '@/lib/prisma'
 
 export type SimpleSeat = {
   id: string
   number: string
   section: string | null
   type: string
   isActive: boolean
   isOccupied: boolean
  libraryId: string
  branchId: string
  row: string | null
  column: string | null
 }
 
 export async function getBranchSeatsSimple(branchId: string): Promise<{ success: boolean; data?: SimpleSeat[]; error?: string }> {
   try {
     const seats = await prisma.seat.findMany({
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
 
    const data: SimpleSeat[] = seats.map(s => ({
       id: s.id,
       number: s.number,
       section: s.section,
       type: s.type,
       isActive: s.isActive,
      isOccupied: s._count.subscriptions > 0,
      libraryId: s.libraryId,
      branchId: s.branchId,
      row: (s as any).row ?? null,
      column: (s as any).column ?? null
     }))
 
     return { success: true, data }
   } catch (error) {
     console.error('Error fetching simple seats:', error)
     return { success: false, error: 'Failed to fetch seats' }
   }
 }
 
 export async function isSeatAvailable(seatId: string, start: Date, end: Date): Promise<{ available: boolean; conflictId?: string }> {
   try {
     const conflicting = await prisma.studentSubscription.findFirst({
       where: {
         seatId,
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
     console.error('Error checking seat availability:', error)
     return { available: false }
   }
 }
 
 export async function getBranchSeatsDetailed(branchId: string): Promise<{ success: boolean; data?: unknown[]; error?: string }> {
   try {
     const seats = await prisma.seat.findMany({
       where: { branchId },
       include: {
         branch: { select: { name: true } },
         subscriptions: {
           where: {
             status: 'active',
             endDate: { gte: new Date() }
           },
           select: {
             id: true,
             student: { select: { name: true, image: true } },
             startDate: true,
             endDate: true
           }
         }
       },
       orderBy: { number: 'asc' }
     })
     return { success: true, data: seats }
   } catch (error) {
     console.error('Error fetching detailed seats:', error)
     return { success: false, error: 'Failed to fetch seats' }
   }
 }

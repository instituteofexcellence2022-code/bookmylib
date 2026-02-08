'use server'

import { quotes, Quote } from '@/lib/quotes'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedStudent } from '@/lib/auth/student'

/**
 * Fetches the list of quotes.
 * In a real backend, this might fetch from a DB and filter/sort.
 * Here we return the static list, optionally shuffled or filtered.
 */
export async function getQuotes(): Promise<Quote[]> {
  // We return the full list. 
  // The client can handle randomization to show a "new" one on load.
  // We simulate a database delay slightly if needed, but for now let's be fast.
  return quotes
}

/**
 * Get a random quote (Server Side)
 * Useful if we only wanted one, but for swiping we need a list.
 */
export async function getRandomQuote(): Promise<Quote> {
  const randomIndex = Math.floor(Math.random() * quotes.length)
  return quotes[randomIndex]
}

/**
 * Get liked quotes IDs for the current student
 */
export async function getLikedQuoteIds(): Promise<number[]> {
  const student = await getAuthenticatedStudent()

  if (!student) return []
  const studentId = student.id

  try {
    const likedQuotes = await prisma.likedQuote.findMany({
      where: { studentId },
      select: { quoteId: true }
    })
    return likedQuotes.map(l => l.quoteId)
  } catch (error) {
    console.error('Error fetching liked quotes:', error)
    return []
  }
}

/**
 * Toggle like status for a quote
 */
export async function toggleQuoteLike(quoteId: number) {
  const student = await getAuthenticatedStudent()

  if (!student) {
    return { success: false, error: 'Unauthorized' }
  }
  const studentId = student.id

  try {
    const existingLike = await prisma.likedQuote.findUnique({
      where: {
        studentId_quoteId: {
          studentId,
          quoteId
        }
      }
    })

    if (existingLike) {
      await prisma.likedQuote.delete({
        where: { id: existingLike.id }
      })
    } else {
      await prisma.likedQuote.create({
        data: {
          studentId,
          quoteId
        }
      })
    }

    revalidatePath('/student/home')
    revalidatePath('/student/profile')
    return { success: true, liked: !existingLike }
  } catch (error) {
    console.error('Error toggling like:', error)
    return { success: false, error: 'Failed to update like status' }
  }
}

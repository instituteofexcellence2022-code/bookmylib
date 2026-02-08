'use server'

import { prisma } from '@/lib/prisma'
import { sendSubscriptionExpiryEmail } from '@/actions/email'
import { addDays, startOfDay, endOfDay } from 'date-fns'

export async function checkAndSendExpiryReminders() {
  try {
    const today = new Date()
    const threeDaysFromNow = addDays(today, 3)
    
    const start = startOfDay(threeDaysFromNow)
    const end = endOfDay(threeDaysFromNow)

    console.log(`Checking for subscriptions expiring between ${start.toISOString()} and ${end.toISOString()}`)

    const expiringSubscriptions = await prisma.studentSubscription.findMany({
      where: {
        status: 'active',
        endDate: {
          gte: start,
          lte: end
        }
      },
      include: {
        student: true,
        plan: true,
        branch: true
      }
    })

    console.log(`Found ${expiringSubscriptions.length} expiring subscriptions`)

    let sentCount = 0
    let errorCount = 0

    for (const sub of expiringSubscriptions) {
      if (sub.student.email && sub.plan) {
        const result = await sendSubscriptionExpiryEmail({
          studentName: sub.student.name,
          studentEmail: sub.student.email,
          planName: sub.plan.name,
          expiryDate: sub.endDate,
          daysLeft: 3,
          branchName: sub.branch.name
        })

        if (result.success) {
          sentCount++
          // Log activity if possible, or just console log
          console.log(`Sent expiry email to ${sub.student.email}`)
        } else {
          errorCount++
          console.error(`Failed to send expiry email to ${sub.student.email}:`, result.error)
        }
      }
    }

    return { success: true, sent: sentCount, errors: errorCount, total: expiringSubscriptions.length }
  } catch (error) {
    console.error('Error in checkAndSendExpiryReminders:', error)
    return { success: false, error: 'Failed to process reminders' }
  }
}

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

export async function autoCheckoutOverdueStudentSessions(hours: number = 20) {
  try {
    const now = new Date()
    const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000)

    const overdue = await prisma.attendance.findMany({
      where: {
        checkOut: null,
        checkIn: { lt: cutoff }
      },
      select: {
        id: true,
        checkIn: true
      }
    })

    let processed = 0
    for (const rec of overdue) {
      const autoCheckoutTime = new Date(rec.checkIn.getTime() + hours * 60 * 60 * 1000)
      const durationMinutes = Math.floor((autoCheckoutTime.getTime() - rec.checkIn.getTime()) / 60000)

      await prisma.attendance.update({
        where: { id: rec.id },
        data: {
          checkOut: autoCheckoutTime,
          duration: durationMinutes > 0 ? durationMinutes : 0,
          status: 'auto_checkout_timeout',
          remarks: 'Auto check-out after maximum session time'
        }
      })
      processed++
    }

    return { success: true, processed }
  } catch (error) {
    console.error('Error in autoCheckoutOverdueStudentSessions:', error)
    return { success: false, error: 'Failed to auto check-out overdue sessions' }
  }
}

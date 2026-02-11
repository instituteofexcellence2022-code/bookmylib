import { checkAndSendExpiryReminders, autoCheckoutOverdueStudentSessions } from '@/actions/cron'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // static by default, unless reading the request

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Allow Vercel Cron to bypass this check if verified in other ways, 
      // but for standard security, checking a secret is good.
      // For this simplified setup, we'll assume the environment variable CRON_SECRET is set.
      // If CRON_SECRET is not set in env, we might skip this check or return error.
      if (process.env.CRON_SECRET) {
        return new NextResponse('Unauthorized', { status: 401 })
      }
    }

    const reminders = await checkAndSendExpiryReminders()
    const autoCheckout = await autoCheckoutOverdueStudentSessions(20)
    return NextResponse.json({ reminders, autoCheckout })
  } catch (error) {
    console.error('Cron job failed:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

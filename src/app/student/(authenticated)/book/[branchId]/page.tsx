import { getStudentBookingStatus } from '@/actions/payment'
import { getBranchDetails } from '@/actions/booking'
import BookingClient from './BookingClient'
import BranchHeader from './BranchHeader'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_KEYS } from '@/lib/auth/session'

export default async function BranchBookingPage({ params }: { params: { branchId: string } }) {
    const cookieStore = await cookies()
    const studentId = cookieStore.get(COOKIE_KEYS.STUDENT)?.value

    if (!studentId) {
        redirect('/student/login')
    }

    const { branchId } = await params
    const [{ success, branch, error }, bookingStatus] = await Promise.all([
        getBranchDetails(branchId),
        getStudentBookingStatus()
    ])

    if (!success || !branch) {
        return (
            <div className="p-6 text-center text-red-500 bg-red-50 rounded-lg">
                {error || 'Failed to load branch details'}
            </div>
        )
    }

    // Parse images
    let images: string[] = []
    try {
        if (branch.images) {
            const parsed = JSON.parse(branch.images as string)
            if (Array.isArray(parsed) && parsed.length > 0) {
                images = parsed
            }
        }
    } catch {}

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            <BranchHeader branch={branch} images={images} />

            <BookingClient 
                branch={branch} 
                studentId={studentId} 
                currentSubscription={bookingStatus.lastSubscription}
            />
        </div>
    )
}

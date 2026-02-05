import { getStudentBookingStatus } from '@/actions/payment'
import { getBranchDetails } from '@/actions/booking'
import BookingClient from './BookingClient'
import { BackButton } from '@/components/ui/BackButton'
import { redirect } from 'next/navigation'
import { getAuthenticatedStudent } from '@/lib/auth/student'

export default async function BranchBookingPage({ params }: { params: Promise<{ branchId: string }> }) {
    const student = await getAuthenticatedStudent()

    if (!student) {
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

    // Parse amenities
    let amenities: string[] = []
    try {
        if (branch.amenities) {
            const parsed = JSON.parse(branch.amenities as string)
            if (Array.isArray(parsed)) {
                amenities = parsed
            }
        }
    } catch {}

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            <div className="space-y-1">
                <BackButton href="/student/book" />
            </div>

            <BookingClient 
                branch={branch} 
                studentId={student.id} 
                currentSubscription={bookingStatus.lastSubscription}
                images={images}
                amenities={amenities}
            />
        </div>
    )
}

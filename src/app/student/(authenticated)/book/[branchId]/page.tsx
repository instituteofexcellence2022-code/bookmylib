import { getStudentBookingStatus } from '@/actions/payment'
import { getBranchDetails } from '@/actions/booking'
import BookingClient from './BookingClient'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function BranchBookingPage({ params }: { params: { branchId: string } }) {
    const cookieStore = await cookies()
    const studentId = cookieStore.get('student_session')?.value

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

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {branch.name}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                            {branch.library.name}
                        </span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {branch.address}, {branch.city}
                    </p>
                </div>
            </div>

            <BookingClient 
                branch={branch} 
                studentId={studentId} 
                currentSubscription={bookingStatus.lastSubscription}
            />
        </div>
    )
}

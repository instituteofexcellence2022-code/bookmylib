import { getBranchDetails } from '@/actions/booking'
import { getBranchOffers } from '@/actions/promo'
import { PublicBookingClient } from '@/components/public/PublicBookingClient'
import { BackButton } from '@/components/ui/BackButton'
import { getAuthenticatedStudent } from '@/lib/auth/student'
import { getAuthenticatedStaff } from '@/lib/auth/staff'
import Link from 'next/link'
import { QrCode, LogIn } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function PublicBranchBookingPage({ params, searchParams }: { params: Promise<{ branchId: string }>, searchParams: Promise<{ qr_code?: string }> }) {
    const { branchId } = await params
    const { qr_code } = await searchParams
    const { success, branch, error } = await getBranchDetails(branchId)
    const offers = await getBranchOffers(branchId)

    // Check for authenticated sessions
    const student = await getAuthenticatedStudent()
    const staff = await getAuthenticatedStaff()

    // Auto-redirect logic for minimal user click
    if (qr_code) {
        if (student) {
            redirect(`/student/attendance/scan?qr_code=${qr_code}`)
        }
        if (staff) {
            redirect(`/staff/scanner?code=${qr_code}`)
        }
    }

    if (!success || !branch) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
                <div className="p-6 text-center text-red-500 bg-red-50 rounded-lg max-w-md w-full">
                    {error || 'Failed to load branch details'}
                    <div className="mt-4">
                        <BackButton href="/discover" />
                    </div>
                </div>
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-12">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <BackButton href="/" />
                </div>

                {/* QR Code Action Banner for Guest/Public Users */}
                {qr_code && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-purple-100 dark:border-purple-900/30">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                    <QrCode className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">You scanned a Branch QR Code</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Login to quickly mark your attendance
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full sm:w-auto">
                                <Link 
                                    href={`/student/login?redirect=/student/attendance/scan?qr_code=${qr_code}`}
                                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Login to Check-in
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                <PublicBookingClient 
                    branch={branch} 
                    images={images}
                    amenities={amenities}
                    offers={offers as any}
                />
            </div>
        </div>
    )
}

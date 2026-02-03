import { getBranchDetails } from '@/actions/booking'
import { getBranchOffers } from '@/actions/promo'
import { PublicBookingClient } from '@/components/public/PublicBookingClient'
import { BackButton } from '@/components/ui/BackButton'

export default async function PublicBranchBookingPage({ params }: { params: Promise<{ branchId: string }> }) {
    const { branchId } = await params
    const { success, branch, error } = await getBranchDetails(branchId)
    const offers = await getBranchOffers(branchId)

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

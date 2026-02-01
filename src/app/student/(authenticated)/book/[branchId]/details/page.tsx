import { getBranchDetails } from '@/actions/booking'
import BranchHeader from '../BranchHeader'
import { BackButton } from '@/components/ui/BackButton'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_KEYS } from '@/lib/auth/session'
import { Clock, MapPin, Shield, Star, Info, Phone, Mail } from 'lucide-react'

export default async function BranchDetailsPage({ params }: { params: { branchId: string } }) {
    const cookieStore = await cookies()
    const studentId = cookieStore.get(COOKIE_KEYS.STUDENT)?.value

    if (!studentId) {
        redirect('/student/login')
    }

    const { branchId } = await params
    const { success, branch, error } = await getBranchDetails(branchId)

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

    // Parse rules
    let rules: string[] = []
    try {
        if (branch.libraryRules) {
            const parsed = JSON.parse(branch.libraryRules as string)
            if (Array.isArray(parsed) && parsed.length > 0) {
                rules = parsed
            }
        }
    } catch {}
    
    // Fallback if no rules found
    if (rules.length === 0) {
        rules = ['Maintain silence inside', 'No food allowed at desk', 'Keep phone on silent mode', 'Keep your desk clean']
    }

    // Parse amenities
    let amenities: string[] = []
    
    const AMENITIES_MAP: Record<string, string> = {
        'wifi': 'Free WiFi',
        'ac': 'Fully AC',
        'coffee': 'Coffee',
        'parking': 'Parking',
        'power': 'Power Backup',
        'printer': 'Printer',
        'cctv': 'CCTV',
        'lounge': 'Lounge',
        'air_purifier': 'Air Purifier',
        'water_purifier': 'RO Water',
        'hot_water': 'Hot/Cold Water',
        'lunch': 'Lunch Area',
        'charging': 'Charging',
        'desk_lights': 'Desk Light',
        'washrooms': 'Sep. Washroom',
        'locker': 'Locker',
        'newspaper': 'Newspaper',
        'magazine': 'Magazine',
        'security': 'Security'
    }

    try {
        if (branch.amenities) {
             const parsed = JSON.parse(branch.amenities as string)
             if (Array.isArray(parsed)) {
                 amenities = parsed.map((id: string) => {
                     return AMENITIES_MAP[id] || id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                 })
             }
        }
    } catch {}

    // Use description from DB or fallback
    const description = branch.description || "Experience a quiet and productive study environment equipped with modern amenities. Our library offers high-speed internet, comfortable seating, and a distraction-free atmosphere perfect for students and professionals."

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
            <div className="space-y-1">
                <BackButton href={`/student/book/${branchId}`} />
                <BranchHeader branch={branch} images={images} showDetailsLink={false} backLink={`/student/book/${branchId}`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* About Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Info className="w-5 h-5 text-blue-500" />
                            About this Branch
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                            {description}
                        </p>
                    </div>

                    {/* Amenities Grid */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-500" />
                            Amenities & Features
                        </h2>
                        {amenities.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {amenities.map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{item}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 italic">No amenities listed.</p>
                        )}
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Location Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-red-500" />
                            Location
                        </h2>
                        <div className="aspect-video w-full bg-gray-100 dark:bg-gray-700 rounded-xl mb-4 relative overflow-hidden group">
                            {/* Map Placeholder */}
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <span className="text-xs">Map View</span>
                            </div>
                        </div>
                        <address className="not-italic text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            <p className="font-medium text-gray-900 dark:text-white">{branch.name}</p>
                            <p>{branch.address}</p>
                            <p>{branch.city}</p>
                        </address>
                        
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span>+91 98765 43210</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span>contact@library.com</span>
                            </div>
                        </div>
                    </div>

                    {/* Rules Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-purple-500" />
                            Library Rules
                        </h2>
                        <ul className="space-y-3">
                            {rules.map((rule, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                                    {rule}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
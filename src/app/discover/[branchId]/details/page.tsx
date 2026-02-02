
import { getBranchDetails } from '@/actions/booking'
import { getBranchOffers } from '@/actions/promo'
import PublicBranchHeader from '@/components/public/PublicBranchHeader'
import { BackButton } from '@/components/ui/BackButton'
import { Clock, MapPin, Shield, Star, Info, Phone, Mail } from 'lucide-react'
import WifiCard from '@/components/student/WifiCard'

export default async function PublicBranchDetailsPage({ params }: { params: { branchId: string } }) {
    const { branchId } = await params
    const { success, branch, error } = await getBranchDetails(branchId)
    const offers = await getBranchOffers(branchId)

    if (!success || !branch) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
                <div className="p-6 text-center text-red-500 bg-red-50 rounded-lg max-w-md w-full">
                    {error || 'Failed to load branch details'}
                    <div className="mt-4">
                        <BackButton href={`/discover/${branchId}`} />
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

    // Parse rules
    let rules: string[] = []
    try {
        if (branch.libraryRules) {
            const rulesData = branch.libraryRules
            if (Array.isArray(rulesData)) {
                rules = rulesData as string[]
            } else if (typeof rulesData === 'string') {
                const parsed = JSON.parse(rulesData)
                if (Array.isArray(parsed)) rules = parsed
            }
        }
    } catch {}
    
    // Parse amenities
    let amenityIds: string[] = []
    
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
                 amenityIds = parsed
             }
        }
    } catch {}

    // Parse wifi details
    let wifiDetails: Array<{ ssid: string; password: string }> = []
    try {
        if (branch.wifiDetails) {
            // Handle both string (if manually inserted) and object (Prisma Json)
            const details = branch.wifiDetails
            if (Array.isArray(details)) {
                wifiDetails = details as any
            } else if (typeof details === 'string') {
                const parsed = JSON.parse(details)
                if (Array.isArray(parsed)) wifiDetails = parsed
            }
        }
    } catch {}

    // Use description from DB
    const description = branch.description

    // Parse operating hours
    let operatingHours: any = null
    try {
        if (branch.operatingHours) {
            const op = branch.operatingHours
            if (typeof op === 'string') {
                operatingHours = JSON.parse(op)
            } else {
                operatingHours = op
            }
        }
    } catch {}

    const formatTime = (time: string) => {
        if (!time) return ''
        const [h, m] = time.split(':')
        const hour = parseInt(h)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const hour12 = hour % 12 || 12
        return `${hour12}:${m} ${ampm}`
    }

    const getOperatingStatus = () => {
        if (!operatingHours) return { isOpen: false, text: 'Closed', nextOpen: '' }

        if (operatingHours.is247) {
            return { isOpen: true, text: 'Open 24/7', nextOpen: 'Always Open' }
        }

        const now = new Date()
        const currentMinutes = now.getHours() * 60 + now.getMinutes()
        
        if (!operatingHours.start || !operatingHours.end) return { isOpen: false, text: 'Closed', nextOpen: '' }

        const [startH, startM] = operatingHours.start.split(':').map(Number)
        const [endH, endM] = operatingHours.end.split(':').map(Number)
        
        const startTotal = startH * 60 + startM
        const endTotal = endH * 60 + endM
        
        let isOpen = false
        if (endTotal < startTotal) {
            isOpen = currentMinutes >= startTotal || currentMinutes < endTotal
        } else {
            isOpen = currentMinutes >= startTotal && currentMinutes < endTotal
        }

        return {
            isOpen,
            text: isOpen ? 'Open Now' : 'Closed',
            nextOpen: isOpen ? `Closes at ${formatTime(operatingHours.end)}` : `Opens at ${formatTime(operatingHours.start)}`
        }
    }

    const status = getOperatingStatus()

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-12">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                <div className="space-y-1">
                    <BackButton href={`/discover/${branchId}`} />
                    <PublicBranchHeader 
                        branch={branch} 
                        images={images} 
                        amenities={amenityIds} 
                        showDetailsLink={false} 
                        backLink={`/discover/${branchId}`} 
                        offers={offers as any}
                    />
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
                                {description || <span className="text-gray-400 italic">No description provided.</span>}
                            </p>
                        </div>

                        {/* Operating Hours Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-emerald-500" />
                                Operating Hours
                            </h2>
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${status.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                    <div>
                                        <p className={`font-semibold ${status.isOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {status.text}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{status.nextOpen}</p>
                                    </div>
                                </div>
                                {operatingHours && (
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {operatingHours.is247 ? '24/7' : `${formatTime(operatingHours.start)} - ${formatTime(operatingHours.end)}`}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Daily Timing</p>
                                    </div>
                                )}
                            </div>
                            {operatingHours?.staffAvailableStart && (
                                 <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <Info className="w-4 h-4 text-blue-500" />
                                    <span>Staff available: {formatTime(operatingHours.staffAvailableStart)} - {formatTime(operatingHours.staffAvailableEnd)}</span>
                                 </div>
                            )}
                        </div>

                        {/* Amenities Grid */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Star className="w-5 h-5 text-amber-500" />
                                Amenities & Features
                            </h2>
                            {amenityIds.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {amenityIds.map((id, i) => (
                                        <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                {AMENITIES_MAP[id] || id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                            </span>
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
                            {branch.mapsLink ? (
                                <div className="aspect-video w-full bg-gray-100 dark:bg-gray-700 rounded-xl mb-4 relative overflow-hidden group">
                                    <iframe 
                                        src={branch.mapsLink}
                                        width="100%" 
                                        height="100%" 
                                        style={{ border: 0 }} 
                                        allowFullScreen 
                                        loading="lazy" 
                                        referrerPolicy="no-referrer-when-downgrade"
                                        className="absolute inset-0 w-full h-full"
                                    />
                                </div>
                            ) : (
                                <div className="aspect-video w-full bg-gray-100 dark:bg-gray-700 rounded-xl mb-4 relative overflow-hidden group">
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                        <span className="text-xs">Map View Not Available</span>
                                    </div>
                                </div>
                            )}
                            <address className="not-italic text-sm text-gray-600 dark:text-gray-300">
                                <p className="font-medium text-gray-900 dark:text-white mb-1">{branch.name}</p>
                                <p>{branch.address}, {branch.city}, {branch.state} - {branch.pincode}</p>
                            </address>
                            
                            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span>{branch.contactPhone || '+91 98765 43210'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span>{branch.contactEmail || 'contact@library.com'}</span>
                                </div>
                            </div>
                        </div>

                        {/* WiFi Card - Public Mode (always locked) */}
                        <WifiCard wifiDetails={wifiDetails} hasActiveSubscription={false} />

                        {/* Rules Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-purple-500" />
                                Library Rules
                            </h2>
                            {rules.length > 0 ? (
                                <ul className="space-y-3">
                                    {rules.map((rule, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                                            {rule}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 italic text-sm">No specific rules listed.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

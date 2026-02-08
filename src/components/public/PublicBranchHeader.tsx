'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { type LucideIcon, MapPin, Building2, Clock, Star, Wifi, Zap, Wind, Droplets, Car, ChevronLeft, ChevronRight, Info, Coffee, Printer, Camera, Armchair, Fan, Thermometer, Utensils, BatteryCharging, Lightbulb, Bath, Lock, Newspaper, BookOpen, ShieldCheck, TicketPercent, X } from 'lucide-react'

export interface PublicOffer {
    id: string
    code: string
    description: string | null
    type: string
    value: number
    duration: number | null
    durationUnit: string | null
    startDate: string | null
    endDate: string | null
    minOrderValue: number | null
    maxDiscount: number | null
}

interface OperatingHours {
    is247?: boolean
    start?: string
    end?: string
    openingTime?: string
    closingTime?: string
    staffAvailableStart?: string
    staffAvailableEnd?: string
}

interface PublicBranchHeaderProps {
    offers?: PublicOffer[]
    branch: {
        id: string
        name: string
        address: string
        city: string
        operatingHours?: OperatingHours | string | null
    }
    images: string[]
    amenities?: string[]
    showDetailsLink?: boolean
    backLink?: string
    onShowDetails?: () => void
}

const AMENITY_ICONS: Record<string, LucideIcon> = {
    'wifi': Wifi,
    'ac': Wind,
    'coffee': Coffee,
    'parking': Car,
    'power': Zap,
    'printer': Printer,
    'cctv': Camera,
    'lounge': Armchair,
    'air_purifier': Fan,
    'water_purifier': Droplets,
    'hot_water': Thermometer,
    'lunch': Utensils,
    'charging': BatteryCharging,
    'desk_lights': Lightbulb,
    'washrooms': Bath,
    'locker': Lock,
    'newspaper': Newspaper,
    'magazine': BookOpen,
    'security': ShieldCheck
}

const AMENITY_LABELS: Record<string, string> = {
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

export default function PublicBranchHeader({ branch, images, amenities = [], showDetailsLink = false, backLink, offers = [] }: PublicBranchHeaderProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [showInfo, setShowInfo] = useState(false)
    const [showOffers, setShowOffers] = useState(false)

    const nextImage = () => {
        if (images.length > 0) {
            setCurrentImageIndex((prev) => (prev + 1) % images.length)
        }
    }

    const prevImage = () => {
        if (images.length > 0) {
            setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
        }
    }

    const currentImage = images.length > 0 ? images[currentImageIndex] : null

    // Process amenities
    const processedAmenities = amenities.map(id => ({
        icon: AMENITY_ICONS[id] || Star,
        label: AMENITY_LABELS[id] || id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }))

    // Parse operating hours
    const getLiveStatus = () => {
        try {
            if (!branch.operatingHours) return { isOpen: false, text: 'Closed' }
            
            const hours = typeof branch.operatingHours === 'string' 
                ? JSON.parse(branch.operatingHours) 
                : branch.operatingHours
            
            if (hours.is247) {
                return { isOpen: true, text: 'Open 24/7' }
            }
            
            const start = hours.start || hours.openingTime
            const end = hours.end || hours.closingTime
            
            if (start && end) {
                const now = new Date()
                const currentMinutes = now.getHours() * 60 + now.getMinutes()
                
                const [startH, startM] = start.split(':').map(Number)
                const [endH, endM] = end.split(':').map(Number)
                
                const startTotal = startH * 60 + startM
                const endTotal = endH * 60 + endM
                
                let isOpenNow = false
                
                if (endTotal < startTotal) {
                    // Overnight (e.g. 9 PM to 2 AM)
                    isOpenNow = currentMinutes >= startTotal || currentMinutes < endTotal
                } else {
                    isOpenNow = currentMinutes >= startTotal && currentMinutes < endTotal
                }
                
                return { 
                    isOpen: isOpenNow, 
                    text: isOpenNow ? 'Open Now' : 'Closed' 
                }
            }
            
            return { isOpen: false, text: 'Closed' }
        } catch {
            return { isOpen: false, text: 'Closed' }
        }
    }

    const { isOpen, text } = getLiveStatus()

    let staffAvailability = '9 AM - 9 PM'
    try {
        if (branch.operatingHours) {
            const hours = typeof branch.operatingHours === 'string' 
                ? JSON.parse(branch.operatingHours) 
                : branch.operatingHours
            
            if (hours.staffAvailableStart && hours.staffAvailableEnd) {
                const formatTime = (time: string) => {
                    const [h] = time.split(':')
                    const hour = parseInt(h)
                    const ampm = hour >= 12 ? 'PM' : 'AM'
                    const hour12 = hour % 12 || 12
                    return `${hour12} ${ampm}`
                }
                staffAvailability = `${formatTime(hours.staffAvailableStart)} - ${formatTime(hours.staffAvailableEnd)}`
            }
        }
    } catch {
        // Fallback to default
    }

    return (
        <div className="flex flex-col gap-1">
            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden min-h-[250px] flex flex-col justify-end group">
                {/* Background Image & Overlay */}
                <div className="absolute inset-0 z-0 bg-gray-900">
                    {currentImage ? (
                        <Image 
                            key={currentImage}
                            src={currentImage} 
                            alt={branch.name} 
                            fill 
                            className="object-cover transition-opacity duration-300"
                            priority
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                            <Building2 className="w-20 h-20 text-white/10" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                </div>

                {/* Navigation Buttons */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={(e) => { e.preventDefault(); prevImage(); }}
                            className="absolute left-2 top-[50%] -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/20 backdrop-blur-md text-white/70 hover:bg-black/40 hover:text-white transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                            aria-label="Previous image"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={(e) => { e.preventDefault(); nextImage(); }}
                            className="absolute right-2 top-[50%] -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/20 backdrop-blur-md text-white/70 hover:bg-black/40 hover:text-white transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                            aria-label="Next image"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>

                        {/* Image Indicators */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                            {images.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-1 rounded-full transition-all duration-300 shadow-sm ${
                                        idx === currentImageIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'
                                    }`}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Live Status Badge */}
                <div className="absolute top-4 left-4 z-10">
                    <div className={`backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-lg border uppercase tracking-wider flex items-center gap-1.5 ${
                        isOpen 
                            ? 'bg-emerald-500/20 border-emerald-400/30' 
                            : 'bg-rose-500/20 border-rose-400/30'
                    }`}>
                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                            isOpen ? 'bg-emerald-400' : 'bg-rose-400'
                        }`} />
                        {text}
                    </div>
                </div>

                {/* Rating Badge */}
                <div className="absolute top-4 right-4 z-10">
                     <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md text-amber-100 text-xs font-bold border border-amber-400/30 shadow-lg">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        4.8 Rating
                    </span>
                </div>
                
                {/* Content Section */}
                <div className={`relative z-10 px-4 pt-4 md:px-6 md:pt-6 ${backLink ? 'pb-0' : 'pb-2 md:pb-3'}`}>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-1">
                        <div className="flex-1">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight mb-2 text-shadow-sm">
                                    {branch.name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-200">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span>{branch.address}, {branch.city}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span>Open 24/7</span>
                                        <div className="relative">
                                            <Info 
                                                onClick={() => setShowInfo(!showInfo)}
                                                className="w-4 h-4 text-emerald-400 shrink-0 cursor-pointer hover:text-emerald-300 transition-colors" 
                                            />
                                            {showInfo && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-xl text-xs text-gray-300 z-50 animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3 text-emerald-400" />
                                                        Operating Hours
                                                    </div>
                                                    <p className="leading-relaxed">
                                                        The library is open 24/7 for members. 
                                                        <span className="block mt-1 text-emerald-400/80">Staff available {staffAvailability}.</span>
                                                    </p>
                                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/95 border-r border-b border-gray-700/50 rotate-45"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Amenities / Tags */}
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide md:max-w-md">
                            {processedAmenities.map((item, index) => (
                                <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white text-xs font-medium border border-white/10 whitespace-nowrap hover:bg-white/20 transition-colors">
                                    <item.icon className="w-3.5 h-3.5 text-emerald-300" />
                                    {item.label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {backLink && (
                    <Link 
                        href={backLink}
                        prefetch={false}
                        className="relative z-20 h-9 w-full bg-black/40 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-4 hover:bg-black/60 transition-colors group/link"
                    >
                        <div className="flex items-center gap-2">
                            <ChevronLeft className="w-3.5 h-3.5 text-emerald-400 group-hover/link:-translate-x-0.5 transition-transform" />
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                Back
                            </span>
                        </div>
                    </Link>
                )}
            </div>

            {showDetailsLink && (
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowOffers(true)}
                        className="h-11 flex-1 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-100/80 dark:hover:bg-amber-900/30 hover:border-amber-200 dark:hover:border-amber-700 hover:shadow-md transition-all duration-300 group/btn active:scale-[0.98]"
                    >
                        <TicketPercent className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover/btn:rotate-12 transition-transform" />
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider group-hover/btn:text-amber-800 dark:group-hover/btn:text-amber-300">
                            Offers
                        </span>
                    </button>
                    <Link 
                        href={`/discover/${branch.id}/details`}
                        className="h-11 flex-1 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/30 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-300 group/link active:scale-[0.98]"
                    >
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider group-hover/link:text-emerald-800 dark:group-hover/link:text-emerald-300">
                            View Details
                        </span>
                        <ChevronRight className="w-4 h-4 text-emerald-500/70 group-hover/link:text-emerald-600 dark:group-hover/link:text-emerald-400 group-hover/link:translate-x-0.5 transition-transform" />
                    </Link>
                </div>
            )}

            {/* Offers Modal */}
            {showOffers && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                    <TicketPercent className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">Current Offers</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Exclusive deals for you</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowOffers(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-4 space-y-3">
                            {offers && offers.length > 0 ? (
                                offers.map((offer) => (
                                    <div key={offer.id} className={`p-3 rounded-xl border border-dashed flex gap-3 ${
                                        offer.type === 'free_trial' 
                                            ? 'border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-900/10'
                                            : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10'
                                    }`}>
                                        <div className={`flex flex-col items-center justify-center px-3 py-1 bg-white dark:bg-gray-800 rounded-lg border shadow-sm min-w-[60px] ${
                                             offer.type === 'free_trial'
                                                ? 'border-purple-100 dark:border-purple-800'
                                                : 'border-emerald-100 dark:border-emerald-800'
                                        }`}>
                                            <span className={`text-xs font-bold ${
                                                 offer.type === 'free_trial' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'
                                            }`}>
                                                {offer.type === 'free_trial' ? 'FREE' : 'FLAT'}
                                            </span>
                                            <span className={`text-xl font-black ${
                                                 offer.type === 'free_trial' ? 'text-purple-700 dark:text-purple-300' : 'text-emerald-700 dark:text-emerald-300'
                                            }`}>
                                                {offer.type === 'free_trial' 
                                                    ? offer.duration 
                                                    : offer.type === 'percentage' 
                                                        ? `${offer.value}%` 
                                                        : `₹${offer.value}`
                                                }
                                            </span>
                                            <span className={`text-[10px] font-bold ${
                                                 offer.type === 'free_trial' ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'
                                            }`}>
                                                {offer.type === 'free_trial' 
                                                    ? (offer.durationUnit === 'months' ? 'MTH' : 'DAY')
                                                    : 'OFF'
                                                }
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                                                {offer.description || offer.code}
                                            </h4>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                {offer.type === 'free_trial' 
                                                    ? `Experience our premium library space for free for ${offer.duration} ${offer.durationUnit}.`
                                                    : `Get ${offer.type === 'percentage' ? 'flat' : 'upto'} ${offer.value}${offer.type === 'percentage' ? '%' : '₹'} off on your subscription.`
                                                }
                                            </p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <code className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider border ${
                                                    offer.type === 'free_trial'
                                                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                                        : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                                }`}>
                                                    {offer.code}
                                                </code>
                                                {offer.endDate && (
                                                    <span className="text-[10px] text-gray-400">
                                                        Valid till {new Date(offer.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No active offers at the moment.
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 text-center">
                            <button 
                                onClick={() => setShowOffers(false)}
                                className="w-full py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
                            >
                                Close Offers
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

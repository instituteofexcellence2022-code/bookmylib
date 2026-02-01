'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Building2, Clock, Star, Wifi, Zap, Wind, Droplets, Car, ChevronLeft, ChevronRight, Info } from 'lucide-react'

interface BranchHeaderProps {
    branch: {
        id: string
        name: string
        address: string
        city: string
        operatingHours?: string | null
    }
    images: string[]
    showDetailsLink?: boolean
    backLink?: string
}

export default function BranchHeader({ branch, images, showDetailsLink = true, backLink }: BranchHeaderProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [showInfo, setShowInfo] = useState(false)

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

    // Simple amenities parser/mock - moved from page.tsx
    const amenities = [
        { icon: Wifi, label: 'Free WiFi' },
        { icon: Wind, label: 'Fully AC' },
        { icon: Zap, label: 'Power Backup' },
        { icon: Droplets, label: 'RO Water' },
        { icon: Car, label: 'Parking' },
    ]

    // Parse operating hours
    const getLiveStatus = () => {
        try {
            if (!branch.operatingHours) return { isOpen: false, text: 'Closed' }
            
            const hours = JSON.parse(branch.operatingHours)
            
            if (hours.is247) {
                return { isOpen: true, text: 'Open 24/7' }
            }
            
            if (hours.start && hours.end) {
                const now = new Date()
                const currentMinutes = now.getHours() * 60 + now.getMinutes()
                
                const [startH, startM] = hours.start.split(':').map(Number)
                const [endH, endM] = hours.end.split(':').map(Number)
                
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
        } catch (e) {
            return { isOpen: false, text: 'Closed' }
        }
    }

    const { isOpen, text } = getLiveStatus()

    let staffAvailability = '9 AM - 9 PM'
    try {
        if (branch.operatingHours) {
            const hours = JSON.parse(branch.operatingHours)
            if (hours.staffAvailableStart && hours.staffAvailableEnd) {
                const formatTime = (time: string) => {
                    const [h, m] = time.split(':')
                    const hour = parseInt(h)
                    const ampm = hour >= 12 ? 'PM' : 'AM'
                    const hour12 = hour % 12 || 12
                    return `${hour12} ${ampm}`
                }
                staffAvailability = `${formatTime(hours.staffAvailableStart)} - ${formatTime(hours.staffAvailableEnd)}`
            }
        }
    } catch (e) {
        // Fallback to default
    }

    return (
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
                        className="absolute left-2 top-[40%] -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/20 backdrop-blur-md text-white/70 hover:bg-black/40 hover:text-white transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                        aria-label="Previous image"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={(e) => { e.preventDefault(); nextImage(); }}
                        className="absolute right-2 top-[40%] -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/20 backdrop-blur-md text-white/70 hover:bg-black/40 hover:text-white transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
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
            <div className={`relative z-10 px-4 pt-4 md:px-6 md:pt-6 ${(showDetailsLink || backLink) ? 'pb-0' : 'pb-4 md:pb-6'}`}>
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
                        {amenities.map((item, index) => (
                            <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white text-xs font-medium border border-white/10 whitespace-nowrap hover:bg-white/20 transition-colors">
                                <item.icon className="w-3.5 h-3.5 text-emerald-300" />
                                {item.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {showDetailsLink && (
                <Link 
                    href={`/student/book/${branch.id}/details`}
                    className="relative z-20 h-9 w-full bg-black/40 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-4 hover:bg-black/60 transition-colors group/link"
                >
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        More Library Details
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-400 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
            )}

            {backLink && (
                <Link 
                    href={backLink}
                    className="relative z-20 h-9 w-full bg-black/40 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-4 hover:bg-black/60 transition-colors group/link"
                >
                    <div className="flex items-center gap-2">
                        <ChevronLeft className="w-3.5 h-3.5 text-emerald-400 group-hover/link:-translate-x-0.5 transition-transform" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                            Back to Booking
                        </span>
                    </div>
                </Link>
            )}
        </div>
    )
}

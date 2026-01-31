'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MapPin, Building2, Clock, Star, Wifi, Zap, Wind, Droplets, Car, ChevronLeft, ChevronRight } from 'lucide-react'

interface BranchHeaderProps {
    branch: {
        name: string
        address: string
        city: string
    }
    images: string[]
}

export default function BranchHeader({ branch, images }: BranchHeaderProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0)

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
        { icon: Wifi, label: 'Free Wi-Fi' },
        { icon: Wind, label: 'AC' },
        { icon: Zap, label: 'Power Backup' },
        { icon: Droplets, label: 'RO Water' },
        { icon: Car, label: 'Parking' },
    ]

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
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/20 backdrop-blur-md text-white/70 hover:bg-black/40 hover:text-white transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
                        aria-label="Previous image"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={(e) => { e.preventDefault(); nextImage(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/20 backdrop-blur-md text-white/70 hover:bg-black/40 hover:text-white transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
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

            {/* Verified Badge */}
            <div className="absolute top-4 left-4 z-10">
                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-lg border border-white/20 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Verified Branch
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
            <div className="relative z-10 p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex-1 space-y-4">
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
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Amenities / Tags */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide md:max-w-md">
                        {amenities.map((item, index) => (
                            <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm text-white text-xs font-medium border border-white/10 whitespace-nowrap hover:bg-white/20 transition-colors">
                                <item.icon className="w-3.5 h-3.5 text-emerald-300" />
                                {item.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

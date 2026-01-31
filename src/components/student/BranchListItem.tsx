'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  MapPin, Building2, Users, Star, Clock, ChevronLeft, ChevronRight,
  Wifi, Coffee, Wind, Zap, Car, Lock, Camera, BookOpen, ShieldCheck,
  ChevronRight as ChevronRightIcon
} from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { BranchCardProps } from './BranchCard'

// Mock function to parse amenities (reused logic)
const getAmenities = (amenitiesString: string | null) => {
  if (!amenitiesString) {
    return [
      { icon: Wifi, label: 'Free Wi-Fi' },
      { icon: Wind, label: 'AC' },
      { icon: Zap, label: 'Power Backup' },
      { icon: Coffee, label: 'RO Water' },
      { icon: Car, label: 'Parking' },
    ]
  }
  
  try {
    return [
      { icon: Wifi, label: 'Free Wi-Fi' },
      { icon: Wind, label: 'AC' },
      { icon: Zap, label: 'Power Backup' },
      { icon: Coffee, label: 'RO Water' },
      { icon: Car, label: 'Parking' },
      { icon: Lock, label: 'Locker' },
      { icon: Camera, label: 'CCTV' },
      { icon: BookOpen, label: 'Newspaper' },
      { icon: ShieldCheck, label: 'Security' }
    ]
  } catch {
    return []
  }
}

export function BranchListItem({ branch }: BranchCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const amenities = getAmenities(branch.amenities)
  
  // Prioritize branch-specific plans. Only use global plans if no branch plans exist.
  const relevantPlans = (branch.plans && branch.plans.length > 0)
    ? branch.plans
    : (branch.library?.plans || [])
  
  // Calculate starting price (Lowest absolute plan price)
  const lowestPlan = relevantPlans.length 
    ? (() => {
        // Find the plan with absolute lowest price
        const sortedPlans = [...relevantPlans].sort((a, b) => a.price - b.price)
        const cheapest = sortedPlans[0]
        
        if (cheapest) {
          // Format duration unit for display
          let unit = cheapest.durationUnit.toLowerCase()
          if (unit === 'month') unit = 'mo'
          else if (unit === 'year') unit = 'yr'
          else if (unit === 'day') unit = 'day'
          
          // If duration > 1, show number (e.g. "3 mo")
          const durationDisplay = cheapest.duration > 1 
            ? `/${cheapest.duration} ${unit}s` // simple pluralization
            : `/${unit}`

          return {
            price: cheapest.price,
            display: durationDisplay
          }
        }
        return null
      })()
    : null

  let images: string[] = []
  try {
    if (branch.images) {
      const parsed = JSON.parse(branch.images)
      if (Array.isArray(parsed) && parsed.length > 0) {
        images = parsed
      }
    }
  } catch {}

  const currentImage = images.length > 0 ? images[currentImageIndex] : null

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col sm:flex-row">
      {/* Image Section - Left (Desktop) / Top (Mobile) */}
      <div className="sm:w-48 md:w-64 h-48 sm:h-auto bg-emerald-100 dark:bg-emerald-900/20 relative shrink-0 overflow-hidden group/image">
        {currentImage ? (
          <Image 
            key={currentImage}
            src={currentImage} 
            alt={branch.name}
            fill
            className="object-cover transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, 300px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-12 h-12 text-emerald-300 dark:text-emerald-700/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent sm:hidden" />
        
        {/* Image Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 z-20"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 z-20"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        <div className="absolute top-2 left-2 sm:hidden pointer-events-none">
            <div className="bg-white/95 dark:bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Open
            </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6">
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Header Info */}
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider truncate">
                {branch.library.name}
              </p>
              <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                <Star className="w-3 h-3 fill-amber-500" />
                4.8
              </div>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight mb-2 group-hover:text-emerald-600 transition-colors">
              {branch.name}
            </h3>
            
            <div className="flex items-start gap-2 text-gray-500 dark:text-gray-400 text-sm">
              <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="line-clamp-1">
                {branch.address}, {branch.city}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3 mt-auto">
             <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1 rounded-full border border-gray-100 dark:border-gray-800">
                <Users className="w-3 h-3 text-emerald-500" />
                <span>{branch._count.seats} Seats</span>
             </div>
             <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1 rounded-full border border-gray-100 dark:border-gray-800">
                <Clock className="w-3 h-3 text-emerald-500" />
                <span>24/7</span>
             </div>
          </div>

          {/* Amenities Preview (Desktop) */}
          <div className="hidden sm:flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            {amenities.slice(0, 5).map((amenity, index) => (
              <div key={index} className="text-gray-400 dark:text-gray-500" title={amenity.label}>
                <amenity.icon className="w-4 h-4" />
              </div>
            ))}
            {amenities.length > 5 && (
              <span className="text-xs text-gray-400 font-medium">+{amenities.length - 5} more</span>
            )}
          </div>
        </div>

        {/* Action Column */}
        <div className="flex flex-row sm:flex-col items-center sm:justify-center sm:border-l sm:border-gray-100 sm:dark:border-gray-700 sm:pl-6 gap-4 sm:min-w-[140px]">
          <div className="flex-1 sm:flex-none text-left sm:text-center">
            <p className="text-xs text-gray-400 font-medium mb-0.5">Starts from</p>
            {lowestPlan ? (
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                ₹{lowestPlan.price}<span className="text-xs text-gray-400 font-normal">{lowestPlan.display}</span>
              </p>
            ) : (
              <p className="text-sm font-bold text-gray-900 dark:text-white">Best Rates</p>
            )}
          </div>

          <Link href={`/student/book/${branch.id}`} className="flex-none">
            <AnimatedButton 
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700 text-sm py-2 px-4 h-auto w-full"
            >
              Book Now
            </AnimatedButton>
          </Link>
        </div>
      </div>
    </div>
  )
}

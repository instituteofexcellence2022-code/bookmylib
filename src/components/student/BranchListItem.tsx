'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  MapPin, Building2, Users, Star, Clock, ChevronLeft, ChevronRight,
  Wifi, Coffee, Wind, Zap, Car, Lock, Camera, BookOpen, ShieldCheck,
  ChevronRight as ChevronRightIcon, Phone, Info
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
    <div className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-row h-auto sm:h-32">
      {/* Image Section - Fixed width */}
      <div className="w-28 sm:w-40 bg-emerald-100 dark:bg-emerald-900/20 relative shrink-0 overflow-hidden group/image">
        <div className="absolute top-1 left-1 z-10 flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full shadow-sm">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Open</span>
        </div>
        {currentImage ? (
          <Image 
            key={currentImage}
            src={currentImage} 
            alt={branch.name}
            fill
            className="object-cover transition-transform duration-500"
            sizes="(max-width: 640px) 120px, 160px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="w-8 h-8 text-emerald-300 dark:text-emerald-700/50" />
          </div>
        )}
        
        {/* Compact Image Nav */}
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 z-20"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 z-20"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      {/* Content Section */}
      <div className="flex-1 p-3 flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight truncate group-hover:text-emerald-600 transition-colors">
              {branch.name}
            </h3>
            <div className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1 py-0.5 rounded shrink-0">
              <Star className="w-3 h-3 fill-amber-500" /> 4.8
            </div>
            {branch.contactPhone && (
              <a 
                href={`tel:${branch.contactPhone}`}
                className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 transition-colors shrink-0"
                onClick={(e) => e.stopPropagation()}
                title="Call Branch"
              >
                <Phone className="w-3 h-3" />
              </a>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{branch.address}, {branch.city}</span>
          </div>

          {/* Compact Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
             <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {branch._count.seats} Seats</span>
             <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 24/7</span>
             <Link href={`/student/book/${branch.id}`} className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors" title="View Details">
               <Info className="w-3 h-3" />
             </Link>
          </div>
        </div>

        {/* Action Column */}
        <div className="flex flex-row sm:flex-col items-center justify-between sm:items-end sm:justify-center gap-2 sm:min-w-[100px] border-t sm:border-t-0 sm:border-l border-gray-100 dark:border-gray-700 pt-2 sm:pt-0 sm:pl-4">
          <div className="text-left sm:text-right">
            <p className="text-[10px] text-gray-400 hidden sm:block">Starts from</p>
            {lowestPlan ? (
              <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                ₹{lowestPlan.price}<span className="text-[10px] text-gray-400 font-normal ml-0.5">{lowestPlan.display}</span>
              </p>
            ) : (
              <p className="text-xs font-bold text-gray-900 dark:text-white">Best Rates</p>
            )}
          </div>

          <Link href={`/student/book/${branch.id}`} className="flex-none">
            <AnimatedButton 
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700 text-xs py-1.5 px-3 h-auto whitespace-nowrap"
            >
              Book Now
            </AnimatedButton>
          </Link>
        </div>
      </div>
    </div>
  )
}

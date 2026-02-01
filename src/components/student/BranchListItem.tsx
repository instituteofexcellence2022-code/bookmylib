'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  MapPin, Building2, Users, Star, Clock, ChevronLeft, ChevronRight,
  Phone, Info,
  Wifi, Coffee, Wind, Zap, Car, Lock, Camera, BookOpen, ShieldCheck
} from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { BranchCardProps } from './BranchCard'
import { BranchDetailsModal } from './BranchDetailsModal'

// Helper to parse amenities safely (consistent with BranchCard)
const getAmenities = (amenitiesString: string | null) => {
  const allAmenities = [
    { id: 'wifi', icon: Wifi, label: 'High-speed WiFi' },
    { id: 'ac', icon: Wind, label: 'Air Conditioning' },
    { id: 'power', icon: Zap, label: 'Power Backup' },
    { id: 'coffee', icon: Coffee, label: 'Coffee Station' },
    { id: 'water_purifier', icon: Coffee, label: 'RO Water' },
    { id: 'parking', icon: Car, label: 'Parking Space' },
    { id: 'printer', icon: Info, label: 'Printing Stn' },
    { id: 'cctv', icon: Camera, label: '24/7 CCTV' },
    { id: 'lounge', icon: Info, label: 'Discussion Area' },
    { id: 'air_purifier', icon: Wind, label: 'Air Purifier' },
    { id: 'lunch', icon: Info, label: 'Lunch Area' },
    { id: 'charging', icon: Zap, label: 'Charging Points' },
    { id: 'desk_lights', icon: Info, label: 'Desk Lights' },
    { id: 'washrooms', icon: Info, label: 'Washrooms' },
    { id: 'locker', icon: Lock, label: 'Locker' },
    { id: 'newspaper', icon: BookOpen, label: 'Newspaper' },
    { id: 'security', icon: ShieldCheck, label: 'Security' }
  ]

  if (!amenitiesString) return allAmenities.slice(0, 8)
  
  try {
    const parsed = JSON.parse(amenitiesString)
    if (Array.isArray(parsed) && parsed.length > 0) {
      if (typeof parsed[0] === 'string') {
          return allAmenities.filter(a => 
            parsed.includes(a.id) || 
            parsed.includes(a.label) || 
            parsed.some((p: string) => p.toLowerCase() === a.label.toLowerCase())
          )
      }
      return allAmenities.slice(0, 8)
    }
    return allAmenities.slice(0, 8)
  } catch {
    return allAmenities.slice(0, 8)
  }
}

export function BranchListItem({ branch, isActiveMember }: BranchCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showHours, setShowHours] = useState(false)
  const [showAmenities, setShowAmenities] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  
  const hoursRef = useRef<HTMLDivElement>(null)
  const amenitiesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (hoursRef.current && !hoursRef.current.contains(event.target as Node)) {
        setShowHours(false)
      }
      if (amenitiesRef.current && !amenitiesRef.current.contains(event.target as Node)) {
        setShowAmenities(false)
      }
    }

    if (showHours || showAmenities) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showHours, showAmenities])

  const amenities = getAmenities(branch.amenities)
  
  // Parse operating hours
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
    <div className={`group bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 flex flex-row h-auto sm:min-h-32 ${(showHours || showAmenities) ? 'relative z-20' : ''}`}>
      {/* Image Section - Fixed width */}
      <div className="w-28 sm:w-40 bg-emerald-100 dark:bg-emerald-900/20 relative shrink-0 overflow-hidden group/image rounded-l-lg">
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
      <div className="flex-1 p-3 flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center min-w-0">
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
          <div className="flex items-center gap-2 flex-wrap">
             <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1.5 rounded-full border border-gray-100 dark:border-gray-800 shrink-0">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span>{branch._count.seats} Seats</span>
             </div>
             
             <div className="relative" ref={hoursRef}>
                <button 
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setShowHours(!showHours)
                    }}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-all duration-200 shrink-0 hover:scale-105 active:scale-95 cursor-pointer hover:shadow-sm ${
                        showHours
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 shadow-sm ring-1 ring-emerald-500/20'
                        : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                >
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>24/7</span>
                </button>
                {showHours && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-xl text-xs text-gray-300 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            Operating Hours
                        </div>
                        <p className="leading-relaxed">
                            Open 24/7 for members. 
                            <span className="block mt-1 text-emerald-400/80">Staff available: {staffAvailability}</span>
                        </p>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/95 border-r border-b border-gray-700/50 rotate-45"></div>
                    </div>
                )}
             </div>

             <div className="relative" ref={amenitiesRef}>
                <button 
                     onClick={(e) => {
                     e.preventDefault()
                     e.stopPropagation()
                     setShowAmenities(!showAmenities)
                     }}
                     className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-all duration-200 shrink-0 hover:scale-105 active:scale-95 cursor-pointer hover:shadow-sm ${
                     showAmenities 
                         ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 shadow-sm ring-1 ring-emerald-500/20' 
                         : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:text-emerald-600 dark:hover:text-emerald-400'
                     }`}
                 >
                    <Coffee className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Amenities</span>
                </button>
                {showAmenities && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-xl text-xs text-gray-300 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="font-semibold text-white mb-2 flex items-center gap-1.5">
                            <Coffee className="w-3 h-3 text-emerald-400" />
                            Amenities
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {amenities.map((amenity, index) => (
                                <div key={index} className="flex items-center gap-1.5 text-gray-300">
                                    <amenity.icon className="w-3 h-3 text-emerald-500 shrink-0" />
                                    <span className="truncate">{amenity.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/95 border-r border-b border-gray-700/50 rotate-45"></div>
                    </div>
                )}
             </div>

             <button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowDetails(true)
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-all duration-200 shrink-0 hover:scale-105 active:scale-95 cursor-pointer hover:shadow-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:text-emerald-600 dark:hover:text-emerald-400"
                  title="More"
               >
                  <Info className="w-3.5 h-3.5 text-emerald-500" />
                  <span>More</span>
              </button>
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
      
      <BranchDetailsModal 
        isOpen={showDetails} 
        onClose={() => setShowDetails(false)} 
        isActiveMember={isActiveMember}
        branch={{
          ...branch,
          seatCount: branch._count.seats
        }} 
      />
    </div>
  )
}
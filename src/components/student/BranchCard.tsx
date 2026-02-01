'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  MapPin, Building2, Users, ChevronDown, ChevronLeft, ChevronRight,
  Wifi, Coffee, Wind, Zap, Car, Lock, Camera, BookOpen, ShieldCheck,
  Star, Clock, Info,
  Book, Phone, Mail, Check, Copy
} from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { BranchDetailsModal } from './BranchDetailsModal'
import { getThemeClasses, ThemeColor } from '@/lib/utils'

// Helper to parse amenities safely
const getAmenities = (amenitiesString: string | null) => {
  const allAmenities = [
    { id: 'wifi', icon: Wifi, label: 'Free WiFi' },
    { id: 'ac', icon: Wind, label: 'Fully AC' },
    { id: 'power', icon: Zap, label: 'Power Backup' },
    { id: 'coffee', icon: Coffee, label: 'Coffee' },
    { id: 'water_purifier', icon: Coffee, label: 'RO Water' },
    { id: 'parking', icon: Car, label: 'Parking' },
    { id: 'printer', icon: Info, label: 'Printer' },
    { id: 'cctv', icon: Camera, label: 'CCTV' },
    { id: 'lounge', icon: Info, label: 'Lounge' },
    { id: 'air_purifier', icon: Wind, label: 'Air Purifier' },
    { id: 'lunch', icon: Info, label: 'Lunch Area' },
    { id: 'charging', icon: Zap, label: 'Charging' },
    { id: 'desk_lights', icon: Info, label: 'Desk Light' },
    { id: 'washrooms', icon: Info, label: 'Sep. Washroom' },
    { id: 'locker', icon: Lock, label: 'Locker' },
    { id: 'newspaper', icon: BookOpen, label: 'Newspaper' },
    { id: 'magazine', icon: Book, label: 'Magazine' },
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

export interface BranchCardProps {
  isActiveMember?: boolean
  theme?: ThemeColor
  branch: {
    id: string
    name: string
    library: {
      name: string
      plans?: {
        price: number
        duration: number
        durationUnit: string
      }[]
    }
    address: string
    city: string
    state: string
    pincode: string
    amenities: string | null
    images: string | null
    // Extended details for modal
    contactPhone?: string | null
    contactEmail?: string | null
    managerName?: string | null
    description?: string | null
    mapsLink?: string | null
    wifiDetails?: any
    operatingHours?: any
    _count: {
      seats: number
    }
    plans?: {
      price: number
      duration: number
      durationUnit: string
    }[]
  }
}

export function BranchCard({ branch, isActiveMember, theme = 'emerald' }: BranchCardProps) {
  const [showAmenities, setShowAmenities] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showHours, setShowHours] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const amenities = getAmenities(branch.amenities)
  const themeClasses = getThemeClasses(theme)
  
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

  // Parse operating hours
  let staffAvailability = '9 AM - 9 PM'
  try {
      if (branch.operatingHours) {
          const hours = typeof branch.operatingHours === 'string' 
            ? JSON.parse(branch.operatingHours) 
            : branch.operatingHours
            
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

  // Calculate operating status
  const getOperatingStatus = () => {
    try {
      if (!branch.operatingHours) return { isOpen: false, text: 'Closed' }
      
      const hours = typeof branch.operatingHours === 'string' 
          ? JSON.parse(branch.operatingHours) 
          : branch.operatingHours
      
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
              // Overnight
              isOpenNow = currentMinutes >= startTotal || currentMinutes < endTotal
          } else {
              isOpenNow = currentMinutes >= startTotal && currentMinutes < endTotal
          }
          
          return { 
              isOpen: isOpenNow, 
              text: isOpenNow ? 'Open Now' : 'Closed' 
          }
      } else if (hours.openingTime && hours.closingTime) {
          // Handle alternative format if exists
          const now = new Date()
          const currentMinutes = now.getHours() * 60 + now.getMinutes()
          
          const [startH, startM] = hours.openingTime.split(':').map(Number)
          const [endH, endM] = hours.closingTime.split(':').map(Number)
          
          const startTotal = startH * 60 + startM
          const endTotal = endH * 60 + endM
          
          let isOpenNow = false
          
          if (endTotal < startTotal) {
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

  const { isOpen, text } = getOperatingStatus()

  return (
    <div className={`group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col h-full ${(showHours || showAmenities) ? 'relative z-20' : ''}`}>
      {/* Branch Image with Overlay Badges */}
      <div className={`h-56 ${themeClasses.bg} flex items-center justify-center relative overflow-hidden group/image rounded-t-2xl`}>
        {/* Background Pattern/Image Placeholder */}
        {currentImage ? (
          <Image 
            key={currentImage} // Force re-render on image change for animation
            src={currentImage} 
            alt={branch.name}
            fill
            className="object-cover transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <Building2 className={`w-20 h-20 ${themeClasses.iconLight} group-hover:scale-110 transition-transform duration-500`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-90" />
        
        {/* Image Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button 
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 z-20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 z-20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            
            {/* Image Dots Indicator */}
            <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-1.5 z-20">
              {images.map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentImageIndex ? 'bg-white w-3' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10 pointer-events-none">
            <div className={`bg-white/95 dark:bg-black/80 dark:backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs font-semibold shadow-sm ${
                isOpen ? themeClasses.text : 'text-red-700 dark:text-red-400'
            }`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    isOpen ? themeClasses.bgSolid : 'bg-red-500'
                }`} />
                {text}
            </div>
            <div className="bg-white/95 dark:bg-black/80 dark:backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-bold text-amber-500 shadow-sm">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                4.8
            </div>
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pt-5 pb-3 text-white z-10 pointer-events-none">
          <h3 className="text-2xl font-bold mb-1 leading-tight">{branch.name}</h3>
          
          {lowestPlan ? (
            <div className="flex items-baseline gap-1.5">
                <span className="text-sm text-gray-300 font-medium">Starts</span>
                <span className="text-xl font-bold text-white">₹{lowestPlan.price}</span>
                <span className="text-xs text-gray-300">{lowestPlan.display}</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1.5">
                <span className="text-sm text-gray-300 font-medium">Best prices</span>
                <span className="text-xs text-gray-300">available</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-b-2xl">
        <div className="space-y-5 flex-1">
          {/* Address & Quick Stats */}
          <div className="flex flex-col gap-4">
             <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                <MapPin className={`w-5 h-5 ${themeClasses.icon} shrink-0 mt-0.5`} />
                <span className="text-sm leading-relaxed font-medium">
                  {branch.address}, {branch.city}, {branch.state} - {branch.pincode}
                </span>
             </div>
             
             <div className="flex items-center gap-2 flex-wrap">
                 <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1.5 rounded-full border border-gray-100 dark:border-gray-800 shrink-0">
                    <Users className={`w-3.5 h-3.5 ${themeClasses.icon}`} />
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
                            ? themeClasses.toggleActive
                            : themeClasses.toggleInactive.replace('[color]', theme)
                        }`}
                    >
                        <Clock className={`w-3.5 h-3.5 ${themeClasses.icon}`} />
                        <span>24/7</span>
                    </button>
                    {showHours && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-xl text-xs text-gray-300 z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                                <Clock className={`w-3 h-3 ${themeClasses.text}`} />
                                Operating Hours
                            </div>
                            <p className="leading-relaxed">
                                Open 24/7 for members. 
                                <span className={`block mt-1 ${themeClasses.text} opacity-80`}>Staff available: {staffAvailability}</span>
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
                             ? themeClasses.toggleActive
                             : themeClasses.toggleInactive.replace('[color]', theme)
                         }`}
                     >
                        <Coffee className={`w-3.5 h-3.5 ${themeClasses.icon}`} />
                        <span>Amenities</span>
                    </button>
                    {showAmenities && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-xl text-xs text-gray-300 z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="font-semibold text-white mb-2 flex items-center gap-1.5">
                                <Coffee className={`w-3 h-3 ${themeClasses.text}`} />
                                Amenities
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                {amenities.map((amenity, index) => (
                                    <div key={index} className="flex items-center gap-1.5 text-gray-300">
                                        <amenity.icon className={`w-3 h-3 ${themeClasses.icon} shrink-0`} />
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
                      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-all duration-200 shrink-0 hover:scale-105 active:scale-95 cursor-pointer hover:shadow-sm ${themeClasses.toggleInactive.replace('[color]', theme)}`}
                      title="More"
                   >
                      <Info className={`w-3.5 h-3.5 ${themeClasses.icon}`} />
                      <span className="hidden sm:inline">More</span>
                  </button>
             </div>
          </div>
        </div>

        <div className="mt-6">
          <Link href={`/student/book/${branch.id}`} className="block">
            <AnimatedButton 
              fullWidth 
              variant="primary"
              icon="arrowRight"
              iconPosition="right"
              className={`${themeClasses.button} shadow-lg hover:shadow-xl translate-y-0`}
            >
              View Seats & Book
            </AnimatedButton>
          </Link>
        </div>
      </div>
      
      <BranchDetailsModal 
        isOpen={showDetails} 
        onClose={() => setShowDetails(false)} 
        isActiveMember={isActiveMember}
        theme={theme}
        branch={{
          ...branch,
          seatCount: branch._count.seats
        }} 
      />
    </div>
  )
}

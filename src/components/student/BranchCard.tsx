'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  MapPin, Building2, Users, ChevronDown, ChevronLeft, ChevronRight,
  Wifi, Coffee, Wind, Zap, Car, Lock, Camera, BookOpen, ShieldCheck,
  Star, Clock, Info
} from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { BranchDetailsModal } from './BranchDetailsModal'

// Helper to parse amenities safely
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

export interface BranchCardProps {
  isActiveMember?: boolean
  branch: {
    id: string
    name: string
    library: {
      name: string
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
    wifiDetails?: string | null
    operatingHours?: string | null
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

export function BranchCard({ branch, isActiveMember }: BranchCardProps) {
  const [showAmenities, setShowAmenities] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const amenities = getAmenities(branch.amenities)
  
  // Calculate starting price (Lowest absolute plan price)
  const lowestPlan = branch.plans?.length 
    ? (() => {
        // Find the plan with absolute lowest price
        const sortedPlans = [...branch.plans].sort((a, b) => a.price - b.price)
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
    <div className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full">
      {/* Branch Image with Overlay Badges */}
      <div className="h-56 bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center relative overflow-hidden group/image">
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
          <Building2 className="w-20 h-20 text-emerald-300 dark:text-emerald-700/50 group-hover:scale-110 transition-transform duration-500" />
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
            <div className="bg-white/95 dark:bg-black/80 dark:backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Open Now
            </div>
            <div className="bg-white/95 dark:bg-black/80 dark:backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-bold text-amber-500 shadow-sm">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                4.8
            </div>
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white z-10 pointer-events-none">
          <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">{branch.library.name}</p>
          <h3 className="text-2xl font-bold mb-2 leading-tight">{branch.name}</h3>
          
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

      <div className="p-5 flex-1 flex flex-col bg-white dark:bg-gray-800">
        <div className="space-y-5 flex-1">
          {/* Address & Quick Stats */}
          <div className="flex flex-col gap-4">
             <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                <MapPin className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-sm leading-relaxed font-medium">
                  {branch.address}, {branch.city}, {branch.state} - {branch.pincode}
                </span>
             </div>
             
             <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                 <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1.5 rounded-full border border-gray-100 dark:border-gray-800 shrink-0">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{branch._count.seats} Seats</span>
                 </div>
                 <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1.5 rounded-full border border-gray-100 dark:border-gray-800 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>24/7</span>
                 </div>
                 <button 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowAmenities(!showAmenities)
                    }}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-all duration-200 shrink-0 ${
                      showAmenities 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' 
                        : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                 >
                    <span>Amenities</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showAmenities ? 'rotate-180' : ''}`} />
                 </button>
                 <button 
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowDetails(true)
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 shrink-0"
                 >
                    <Info className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Details</span>
                 </button>
             </div>

            {/* Amenities List */}
            <div className={`
              overflow-hidden transition-all duration-300 ease-in-out w-full
              ${showAmenities ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
            `}>
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-900/10 rounded-md border border-emerald-100 dark:border-emerald-900/20"
                    title={amenity.label}
                  >
                    <amenity.icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">{amenity.label}</span>
                  </div>
                ))}
              </div>
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
              className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none shadow-lg hover:shadow-xl translate-y-0"
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
        branch={{
          ...branch,
          seatCount: branch._count.seats
        }} 
      />
    </div>
  )
}

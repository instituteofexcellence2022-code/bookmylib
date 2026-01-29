'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  MapPin, Building2, Users, ChevronDown,
  Wifi, Coffee, Wind, Zap, Car, Lock, Camera, BookOpen, ShieldCheck,
  Star, Clock
} from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'

// Mock function to parse amenities
const getAmenities = (amenitiesString: string | null) => {
  if (!amenitiesString) {
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

interface BranchCardProps {
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

export function BranchCard({ branch }: BranchCardProps) {
  const [showAmenities, setShowAmenities] = useState(false)
  const amenities = getAmenities(branch.amenities)
  
  // Calculate starting price
  const minPrice = branch.plans?.length 
    ? Math.min(...branch.plans.map(p => p.price)) 
    : null

  let branchImage: string | null = null
  try {
    if (branch.images) {
      const parsed = JSON.parse(branch.images)
      if (Array.isArray(parsed) && parsed.length > 0) {
        branchImage = parsed[0]
      }
    }
  } catch {}

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full">
      {/* Branch Image with Overlay Badges */}
      <div className="h-56 bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center relative overflow-hidden">
        {/* Background Pattern/Image Placeholder */}
        {branchImage ? (
          <Image 
            src={branchImage} 
            alt={branch.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <Building2 className="w-20 h-20 text-emerald-300 dark:text-emerald-700/50 group-hover:scale-110 transition-transform duration-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-90" />
        
        {/* Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
            <div className="bg-white/95 dark:bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Open Now
            </div>
            <div className="bg-white/95 dark:bg-black/80 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 text-xs font-bold text-amber-500 shadow-sm">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                4.8
            </div>
        </div>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white z-10">
          <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">{branch.library.name}</p>
          <h3 className="text-2xl font-bold mb-2 leading-tight">{branch.name}</h3>
          
          {minPrice ? (
            <div className="flex items-baseline gap-1.5">
                <span className="text-sm text-gray-300 font-medium">Starts</span>
                <span className="text-xl font-bold text-white">₹{minPrice}</span>
                <span className="text-xs text-gray-300">/mo</span>
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
             
             <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-800">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{branch._count.seats} Seats</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-800">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    <span>24/7 Access</span>
                 </div>
             </div>
          </div>

          {/* Amenities Section with Toggle */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <button 
              onClick={() => setShowAmenities(!showAmenities)}
              className="flex items-center justify-between w-full text-left group/btn"
            >
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider group-hover/btn:text-emerald-600 transition-colors">
                Amenities & Facilities
              </p>
              <div className={`
                p-1 rounded-full transition-all duration-300
                ${showAmenities ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-gray-100 text-gray-400'}
              `}>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAmenities ? 'rotate-180' : ''}`} />
              </div>
            </button>
            
            <div className={`
              overflow-hidden transition-all duration-300 ease-in-out
              ${showAmenities ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}
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
    </div>
  )
}

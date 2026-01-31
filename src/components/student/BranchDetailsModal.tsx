'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, Wifi, Clock, Phone, Mail, MapPin, Info, 
  ExternalLink, Calendar, ShieldCheck, Monitor,
  Lock, Copy, Check, Coffee, Wind, Zap, Car, Camera, BookOpen, Users
} from 'lucide-react'
import { toast } from 'sonner'

interface WifiDetail {
  ssid: string
  password?: string
  notes?: string
}

interface OperatingHours {
  openingTime: string
  closingTime: string
  is247: boolean
  workingDays: string[]
}

interface BranchDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  branch: {
    name: string
    address: string
    city: string
    state: string
    pincode: string
    contactPhone?: string | null
    contactEmail?: string | null
    managerName?: string | null
    seatCount?: number
    description?: string | null
    mapsLink?: string | null
    wifiDetails?: string | null
    operatingHours?: string | null
    amenities?: string | null
    images?: string | null
  }
}

export function BranchDetailsModal({ isOpen, onClose, branch }: BranchDetailsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!mounted || !isOpen) return null

  const parseJson = <T,>(jsonString: string | null, fallback: T | null = null): T | null => {
    if (!jsonString) return fallback
    try {
      return JSON.parse(jsonString)
    } catch {
      return fallback
    }
  }

  const wifiDetails = parseJson<WifiDetail[]>(branch.wifiDetails, [])
  const rawOperatingHours = parseJson<any>(branch.operatingHours)
  
  // Validate operating hours structure
  let operatingHours: OperatingHours | string | null = null
  
  if (rawOperatingHours) {
    if (typeof rawOperatingHours === 'string') {
      operatingHours = rawOperatingHours
    } else {
      operatingHours = {
        openingTime: rawOperatingHours.openingTime || '09:00',
        closingTime: rawOperatingHours.closingTime || '21:00',
        is247: !!rawOperatingHours.is247,
        workingDays: Array.isArray(rawOperatingHours.workingDays) ? rawOperatingHours.workingDays : []
      }
    }
  }
  
  // Parse amenities correctly
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
 
     if (!amenitiesString) return allAmenities.slice(0, 8) // Default subset if null
 
     try {
       const parsed = JSON.parse(amenitiesString)
       if (Array.isArray(parsed) && parsed.length > 0) {
         if (typeof parsed[0] === 'string') {
            // Filter by ID (preferred) or Label match
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

  const amenities = getAmenities(branch.amenities)

  // Helper to handle copy to clipboard
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedField(null), 2000)
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{branch.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {branch.city}, {branch.state}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto space-y-8">
          
          {/* About / Description */}
          {(branch.description || branch.seatCount) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-500" />
                About
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl space-y-3">
                {branch.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {branch.description}
                  </p>
                )}
                {branch.seatCount !== undefined && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Seating Capacity: <span className="text-gray-900 dark:text-white">{branch.seatCount} Seats</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact & Location */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-500" />
              Contact & Location
            </h3>
            <div className="grid gap-3">
              {branch.managerName && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="p-2 bg-white dark:bg-gray-900 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Branch Manager</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{branch.managerName}</p>
                  </div>
                </div>
              )}
              
              {branch.contactPhone && (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-900 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{branch.contactPhone}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCopy(branch.contactPhone!, 'phone')}
                    className="p-2 hover:bg-white dark:hover:bg-gray-900 rounded-lg text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    {copiedField === 'phone' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
              
              {branch.contactEmail && (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-900 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{branch.contactEmail}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCopy(branch.contactEmail!, 'email')}
                    className="p-2 hover:bg-white dark:hover:bg-gray-900 rounded-lg text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    {copiedField === 'email' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-gray-900 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                      {branch.address}, {branch.city} - {branch.pincode}
                    </p>
                  </div>
                </div>
                {branch.mapsLink && (
                  <a 
                    href={branch.mapsLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-white dark:hover:bg-gray-900 rounded-lg text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Amenities */}
          {amenities.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Amenities
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {amenities.map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-800">
                    <amenity.icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{amenity.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WiFi Details */}
          {wifiDetails && Array.isArray(wifiDetails) && wifiDetails.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-500" />
                WiFi Access
              </h3>
              <div className="grid gap-3">
                {wifiDetails.map((wifi, idx) => (
                  <div key={idx} className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Wifi className="w-16 h-16 text-emerald-600" />
                    </div>
                    <div className="relative z-10 space-y-3">
                      <div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Network Name (SSID)</p>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-bold text-gray-900 dark:text-white">{wifi.ssid}</p>
                          <button 
                            onClick={() => handleCopy(wifi.ssid, `ssid-${idx}`)}
                            className="p-1 text-emerald-600/50 hover:text-emerald-600 transition-colors"
                          >
                            {copiedField === `ssid-${idx}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                      {wifi.password && (
                        <div>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-1">Password</p>
                          <div className="flex items-center gap-2">
                            <p className="text-base font-mono font-bold text-gray-900 dark:text-white bg-white/50 dark:bg-black/20 px-2 py-1 rounded">{wifi.password}</p>
                            <button 
                              onClick={() => handleCopy(wifi.password!, `pass-${idx}`)}
                              className="p-1 text-emerald-600/50 hover:text-emerald-600 transition-colors"
                            >
                              {copiedField === `pass-${idx}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operating Hours */}
          {operatingHours && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                Operating Hours
              </h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                {typeof operatingHours === 'string' ? (
                   <p className="text-sm text-gray-600 dark:text-gray-400">{operatingHours}</p>
                ) : (
                   <div className="space-y-4">
                     <div className="flex items-center justify-between">
                       <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</span>
                       <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                         operatingHours.is247 
                           ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                           : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                       }`}>
                         {operatingHours.is247 ? 'Open 24/7' : 'Standard Hours'}
                       </span>
                     </div>

                     {!operatingHours.is247 && (
                       <div className="flex items-center justify-between">
                         <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Daily Timing</span>
                         <span className="text-sm font-semibold text-gray-900 dark:text-white">
                           {operatingHours.openingTime} - {operatingHours.closingTime}
                         </span>
                       </div>
                     )}

                     <div className="space-y-2">
                       <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Working Days</span>
                       <div className="flex flex-wrap gap-2">
                         {operatingHours.workingDays?.map((day) => (
                           <span 
                             key={day}
                             className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300"
                           >
                             {day}
                           </span>
                         ))}
                       </div>
                     </div>
                   </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { X, Check, MapPin, Search, Crosshair, Loader2, Navigation } from 'lucide-react'
import { toast } from 'react-hot-toast'

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface LocationPickerProps {
  initialLat?: number
  initialLng?: number
  onLocationSelect: (lat: number, lng: number) => void
  onClose: () => void
}

function LocationMarker({ position, setPosition }: { position: [number, number], setPosition: (pos: [number, number]) => void }) {
  const map = useMap()
  const markerRef = useRef<L.Marker>(null)

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker != null) {
          const { lat, lng } = marker.getLatLng()
          setPosition([lat, lng])
        }
      },
    }),
    [setPosition],
  )

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
    },
  })

  useEffect(() => {
    map.flyTo(position, map.getZoom())
  }, [position, map])

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  )
}

function MapControls({ onLocationFound, onSearchSelect }: { 
  onLocationFound: (lat: number, lng: number) => void,
  onSearchSelect: (lat: number, lng: number) => void 
}) {
  const map = useMap()
  const [isLocating, setIsLocating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])

  const handleLocateMe = () => {
    setIsLocating(true)
    map.locate().on('locationfound', function (e) {
      onLocationFound(e.latlng.lat, e.latlng.lng)
      map.flyTo(e.latlng, map.getZoom())
      setIsLocating(false)
      toast.success('Location detected!')
    }).on('locationerror', function (e) {
      console.error(e)
      toast.error('Could not access your location')
      setIsLocating(false)
    })
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      setSearchResults(data)
      if (data.length === 0) {
        toast.error('No results found')
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search location')
    } finally {
      setIsSearching(false)
    }
  }

  const selectResult = (result: any) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    onSearchSelect(lat, lng)
    setSearchResults([])
    setSearchQuery('')
  }

  return (
    <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
      <div className="flex gap-2 pointer-events-auto">
        <div className="relative flex-1 max-w-md">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a place..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin absolute right-3.5 top-3" />
            )}
          </form>
          
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
              {searchResults.map((result, i) => (
                <button
                  key={i}
                  onClick={() => selectResult(result)}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  {result.display_name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          title="Locate Me"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
          ) : (
            <Navigation className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  )
}

export default function LocationPicker({ initialLat, initialLng, onLocationSelect, onClose }: LocationPickerProps) {
  // Default to Bangalore if no coords provided
  const [position, setPosition] = useState<[number, number]>([
    initialLat || 12.9716, 
    initialLng || 77.5946
  ])

  const handleConfirm = () => {
    onLocationSelect(position[0], position[1])
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[85vh] md:h-[700px] border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              Pick Location
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Drag marker or search to set location
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 relative z-0">
          <MapContainer 
            center={position} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker position={position} setPosition={setPosition} />
            <MapControls 
              onLocationFound={(lat, lng) => setPosition([lat, lng])}
              onSearchSelect={(lat, lng) => setPosition([lat, lng])}
            />
          </MapContainer>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
          <div className="text-sm font-mono text-gray-600 dark:text-gray-300 hidden sm:flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700">
            <Crosshair className="w-4 h-4 text-gray-400" />
            {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </div>
          <div className="flex gap-3 w-full sm:w-auto justify-end">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex items-center gap-2 shadow-lg shadow-purple-200 dark:shadow-purple-900/20"
            >
              <Check className="w-4 h-4" />
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

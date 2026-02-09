'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, LayersControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { X, Check, MapPin, Search, Crosshair, Loader2, Navigation, Layers } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useDebounce } from 'use-debounce'

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

// Custom Marker Icon
const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

function LocationMarker({ position, setPosition, onDragEnd }: { 
  position: [number, number], 
  setPosition: (pos: [number, number]) => void,
  onDragEnd: (lat: number, lng: number) => void 
}) {
  const map = useMap()
  const markerRef = useRef<L.Marker>(null)

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker != null) {
          const { lat, lng } = marker.getLatLng()
          setPosition([lat, lng])
          onDragEnd(lat, lng)
        }
      },
    }),
    [setPosition, onDragEnd],
  )

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
      onDragEnd(e.latlng.lat, e.latlng.lng)
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
      icon={customIcon}
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
  const [debouncedQuery] = useDebounce(searchQuery, 500)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])

  const handleLocateMe = () => {
    setIsLocating(true)
    map.locate({ enableHighAccuracy: true }).on('locationfound', function (e) {
      onLocationFound(e.latlng.lat, e.latlng.lng)
      map.flyTo(e.latlng, 18)
      setIsLocating(false)
      toast.success('Location detected!')
    }).on('locationerror', function (e) {
      console.error(e)
      toast.error(e.message === 'User denied Geolocation' 
        ? 'Location permission denied' 
        : 'Could not access your location')
      setIsLocating(false)
    })
  }

  // Effect for Autocomplete Search
  useEffect(() => {
    const searchLocation = async () => {
      if (!debouncedQuery.trim()) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedQuery)}&limit=5`)
        const data = await response.json()
        setSearchResults(data)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }

    searchLocation()
  }, [debouncedQuery])

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
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search address, city, or landmark..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm transition-all"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            {isSearching && (
              <Loader2 className="w-4 h-4 text-purple-600 animate-spin absolute right-3.5 top-3.5" />
            )}
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto overflow-x-hidden">
              {searchResults.map((result, i) => (
                <button
                  key={i}
                  onClick={() => selectResult(result)}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-start gap-2"
                >
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <span className="truncate">{result.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className="w-11 h-11 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors"
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
  const [address, setAddress] = useState<string>('')
  const [isFetchingAddress, setIsFetchingAddress] = useState(false)

  const fetchAddress = useCallback(async (lat: number, lng: number) => {
    setIsFetchingAddress(true)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await response.json()
      if (data && data.display_name) {
        setAddress(data.display_name)
      }
    } catch (error) {
      console.error('Error fetching address:', error)
      setAddress('Address not found')
    } finally {
      setIsFetchingAddress(false)
    }
  }, [])

  // Fetch initial address
  useEffect(() => {
    fetchAddress(position[0], position[1])
  }, []) // Run once on mount

  const handleConfirm = () => {
    onLocationSelect(position[0], position[1])
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[85vh] md:h-[700px] border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              Pick Location
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Drag marker to pinpoint exact location
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 relative z-0 bg-gray-100">
          <MapContainer 
            center={position} 
            zoom={15} 
            style={{ height: '100%', width: '100%' }}
          >
            <LayersControl position="bottomright">
              <LayersControl.BaseLayer checked name="Street Map">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite">
                <TileLayer
                  attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            <LocationMarker 
              position={position} 
              setPosition={setPosition} 
              onDragEnd={fetchAddress}
            />
            <MapControls 
              onLocationFound={(lat, lng) => {
                setPosition([lat, lng])
                fetchAddress(lat, lng)
              }}
              onSearchSelect={(lat, lng) => {
                setPosition([lat, lng])
                fetchAddress(lat, lng)
              }}
            />
          </MapContainer>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Selected Address</span>
              </div>
              <div className="text-sm text-gray-900 dark:text-gray-100 font-medium min-h-[1.25rem]">
                {isFetchingAddress ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Fetching address...
                  </div>
                ) : (
                  address || 'No address selected'
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1 font-mono">
                {position[0].toFixed(6)}, {position[1].toFixed(6)}
              </div>
            </div>

            <div className="flex gap-3 w-full sm:w-auto justify-end">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm}
                disabled={isFetchingAddress}
                className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-purple-200 dark:shadow-purple-900/20 transition-all hover:scale-105 active:scale-95"
              >
                <Check className="w-4 h-4" />
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

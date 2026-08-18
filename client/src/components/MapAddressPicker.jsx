import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Search, MapPin, Check, X } from 'lucide-react'

// Fix the Vite/bundler default-marker icon bug
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse'

/** Maps Nominatim's address object onto standard address shape. */
function addressToParts(address) {
  return {
    line1: [address?.house_number, address?.road].filter(Boolean).join(' ') || address?.neighbourhood || address?.suburb || '',
    city: address?.city || address?.town || address?.village || address?.municipality || '',
    state: address?.state || '',
    postalCode: address?.postcode || '',
    country: address?.country || '',
  }
}

/** Places a draggable marker on click/drag and updates location. */
function ClickMarker({ position, onMove }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng)
    },
  })
  return position ? (
    <Marker
      position={position}
      draggable
      eventHandlers={{ dragend: (e) => onMove(e.target.getLatLng()) }}
    />
  ) : null
}

/** Re-centers the map when search or initial position changes. */
function Recenter({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 15))
  }, [position, map])
  return null
}

export default function MapAddressPicker({ initialLat, initialLng, onConfirm, onCancel }) {
  const defaultCenter = [initialLat || 30.7333, initialLng || 76.7794]
  const initialPosition =
    initialLat != null && initialLng != null ? [Number(initialLat), Number(initialLng)] : null

  const [position, setPosition] = useState(initialPosition || defaultCenter)
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [pickedAddress, setPickedAddress] = useState('')
  const [selectedGeo, setSelectedGeo] = useState(null)

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      )
      if (!res.ok) return null
      const data = await res.json()
      return {
        display: data.display_name || '',
        ...addressToParts(data.address),
      }
    } catch {
      return null
    }
  }

  const handleMove = async (latlng) => {
    const lat = Number(latlng.lat)
    const lng = Number(latlng.lng)
    setPosition([lat, lng])
    const geo = await reverseGeocode(lat, lng)
    if (geo) {
      setPickedAddress(geo.display)
      setSelectedGeo({ lat, lng, ...geo })
    } else {
      setSelectedGeo({ lat, lng })
    }
  }

  const handleSearch = async () => {
    if (!search.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `${NOMINATIM_SEARCH}?q=${encodeURIComponent(search)}&format=json&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      if (data[0]) {
        const { lat, lon, address, display_name } = data[0]
        const latNum = parseFloat(lat)
        const lngNum = parseFloat(lon)
        setPosition([latNum, lngNum])
        setPickedAddress(display_name)
        setSelectedGeo({
          lat: latNum,
          lng: lngNum,
          display: display_name,
          ...addressToParts(address),
        })
      }
    } finally {
      setSearching(false)
    }
  }

  const handleConfirm = () => {
    if (!selectedGeo) {
      // Fallback if user didn't move pin but position exists
      onConfirm({
        lat: position[0],
        lng: position[1],
        display: pickedAddress,
      })
      return
    }
    onConfirm(selectedGeo)
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
            placeholder="Search sector, area, city, or PIN code..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Map Container */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-inner">
        <MapContainer
          center={position || defaultCenter}
          zoom={position ? 15 : 12}
          style={{ height: 300, width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter position={position} />
          <ClickMarker position={position} onMove={handleMove} />
        </MapContainer>
      </div>

      {/* Selected Address Display */}
      {pickedAddress ? (
        <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700">
          <MapPin className="size-4 text-rose-500 shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-relaxed">{pickedAddress}</span>
        </div>
      ) : (
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          <MapPin className="size-3.5 text-slate-400" /> Click or drag the pin on the map to choose your exact doorstep.
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="size-3.5" /> Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition shadow-sm"
        >
          <Check className="size-4" /> Confirm Location
        </button>
      </div>
    </div>
  )
}
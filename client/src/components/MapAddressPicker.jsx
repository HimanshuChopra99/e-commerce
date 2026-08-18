import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix the Vite/bundler default-marker icon bug: leaflet resolves icon URLs
// relative to the bundle, so we point them at the CDN instead.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse'

/** Maps Nominatim's `address` object onto the store's address field shape. */
function addressToParts(address) {
  return {
    line1: [address?.house_number, address?.road].filter(Boolean).join(' ') || address?.neighbourhood || '',
    city: address?.city || address?.town || address?.village || '',
    state: address?.state || '',
    postalCode: address?.postcode || '',
    country: address?.country || '',
  }
}

/** Places a draggable marker on click and reports every move back up. */
function ClickMarker({ position, onMove }) {
  useMapEvents({
    click(e) { onMove(e.latlng) },
  })
  return position
    ? (
        <Marker
          position={position}
          draggable
          eventHandlers={{ dragend: (e) => onMove(e.target.getLatLng()) }}
        />
      )
    : null
}

/** Re-centers the map when a search (not a drag) moves the pin. */
function Recenter({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 13))
  }, [position, map])
  return null
}

export default function MapAddressPicker({ initialLat, initialLng, onChange }) {
  const defaultCenter = [initialLat || 30.7333, initialLng || 76.7794]
  const initialPosition =
    initialLat != null && initialLng != null ? [Number(initialLat), Number(initialLng)] : null

  const [position, setPosition] = useState(initialPosition)
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [pickedAddress, setPickedAddress] = useState('')

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
    if (geo) setPickedAddress(geo.display)
    onChange({ lat, lng, ...(geo || {}) })
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
        onChange({
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

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search address or drop pin on map…"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-black"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg disabled:bg-gray-400"
        >
          {searching ? '…' : 'Search'}
        </button>
      </div>

      <MapContainer
        center={position || defaultCenter}
        zoom={position ? 15 : 12}
        style={{ height: 260, borderRadius: 10, zIndex: 0 }}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter position={position} />
        <ClickMarker position={position} onMove={handleMove} />
      </MapContainer>

      {pickedAddress && (
        <p className="text-xs text-gray-500 flex gap-1 items-start">
          <span>📍</span>
          <span className="line-clamp-2">{pickedAddress}</span>
        </p>
      )}
      <p className="text-[11px] text-gray-400">Click map or drag pin to set exact location</p>
    </div>
  )
}

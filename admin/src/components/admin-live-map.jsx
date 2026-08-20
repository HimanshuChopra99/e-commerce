/**
 * AdminLiveMap.jsx
 *
 * Live map component for the admin order detail page.
 * Shows:
 *  - Delivery partner's current position (moving in real-time)
 *  - Warehouse location (Current Location obtained via navigator.geolocation - ALWAYS visible)
 *  - Customer drop-off location (Drop-off pin)
 *  - Continuous solid line route (no dashed/dotted lines)
 */
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { adminTracker } from '@/services/admin-tracker'
import 'leaflet/dist/leaflet.css'

const DEFAULT_WAREHOUSE_LAT = 30.7333
const DEFAULT_WAREHOUSE_LNG = 76.7794

// ── Custom marker icons ───────────────────────────────────────────────────────
const partnerIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:38px;height:38px;border-radius:50%;
    background:linear-gradient(135deg,#8b5cf6,#6d28d9);
    border:3px solid white;
    box-shadow:0 2px 12px rgba(139,92,246,0.55);
    display:flex;align-items:center;justify-content:center;
    font-size:18px;
  ">🛵</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
})

// Warehouse icon in BLUE
const warehouseIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:38px;height:38px;border-radius:10px;
    background:linear-gradient(135deg,#3b82f6,#1d4ed8);
    border:3px solid white;
    box-shadow:0 2px 12px rgba(37,99,235,0.55);
    display:flex;align-items:center;justify-content:center;
    font-size:18px;
  ">🏪</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
})

const customerIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:38px;height:38px;border-radius:50%;
    background:linear-gradient(135deg,#10b981,#059669);
    border:3px solid white;
    box-shadow:0 2px 12px rgba(16,185,129,0.55);
    display:flex;align-items:center;justify-content:center;
    font-size:18px;
  ">📍</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
})

// ── Route fetching ────────────────────────────────────────────────────────────
async function fetchRoute(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const json = await res.json()
    const coords = json?.routes?.[0]?.geometry?.coordinates
    if (!coords) return null
    return coords.map(([lng, lat]) => [lat, lng])
  } catch {
    return null
  }
}

// ── Map bounds controller ─────────────────────────────────────────────────────
function MapController({ partnerPos, destPos }) {
  const map = useMap()
  const fittedRef = useRef(false)

  useEffect(() => {
    fittedRef.current = false
  }, [destPos])

  useEffect(() => {
    if (fittedRef.current) return
    const points = [partnerPos, destPos].filter(Boolean)
    if (points.length >= 2) {
      try {
        const bounds = L.latLngBounds(points).pad(0.3)
        map.fitBounds(bounds, { animate: true, duration: 1 })
        fittedRef.current = true
      } catch {}
    }
  }, [partnerPos, destPos, map])

  return null
}

/**
 * @param {object}  props
 * @param {[number, number] | null} props.partnerPos
 * @param {'to_warehouse' | 'to_customer' | null} props.phase
 * @param {{ lat: number|null, lng: number|null, city: string, state: string }} props.shippingAddress
 * @param {{ lat: number|null, lng: number|null, address: string }} props.pickupAddress
 * @param {string}  props.className
 */
export function AdminLiveMap({ partnerPos, phase, shippingAddress, pickupAddress, className = '' }) {
  const [route, setRoute] = useState([])
  const routeKeyRef = useRef(null)

  // Live Warehouse Position obtained via browser geolocation
  const initialWLat = Number(pickupAddress?.lat ?? DEFAULT_WAREHOUSE_LAT)
  const initialWLng = Number(pickupAddress?.lng ?? DEFAULT_WAREHOUSE_LNG)
  const [liveWarehousePos, setLiveWarehousePos] = useState([initialWLat, initialWLng])

  const warehouseLabel = pickupAddress?.address || 'KICKS Main Hub'

  // Get Admin's exact current device geolocation for Warehouse
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setLiveWarehousePos([lat, lng])

          // Sync location to server socket
          const socket = adminTracker.socket
          if (socket && socket.connected) {
            socket.emit('admin:set_warehouse_location', {
              lat,
              lng,
              address: warehouseLabel,
            })
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 6000 }
      )
    }
  }, [warehouseLabel])

  const customerPos =
    shippingAddress?.lat && shippingAddress?.lng
      ? [Number(shippingAddress.lat), Number(shippingAddress.lng)]
      : null

  // Destination based on phase
  const isWarehousePhase = phase === 'to_warehouse' || phase === null
  const currentDestPos = isWarehousePhase ? liveWarehousePos : customerPos

  // Route color: BLUE for Phase 1, Green for Phase 2
  const routeColor = isWarehousePhase ? '#2563eb' : '#10b981'
  const defaultCenter = partnerPos ?? currentDestPos ?? liveWarehousePos

  // Fetch route when partner or destination changes
  useEffect(() => {
    if (!partnerPos || !currentDestPos) {
      setRoute([])
      return
    }
    const key = `${partnerPos.join(',')}-${currentDestPos.join(',')}`
    if (routeKeyRef.current === key) return
    routeKeyRef.current = key

    fetchRoute(partnerPos, currentDestPos).then((r) => {
      setRoute(r ?? [partnerPos, currentDestPos])
    })
  }, [partnerPos, currentDestPos])

  const dropoffLabel = [shippingAddress?.city, shippingAddress?.state].filter(Boolean).join(', ') || 'Customer'

  return (
    <div className={`relative overflow-hidden rounded-xl border border-border ${className}`}>
      {/* Phase indicator chip in BLUE for Phase 1, Green for Phase 2 */}
      {phase && (
        <div
          className='absolute top-3 left-3 z-[1000] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-md backdrop-blur-sm'
          style={{ background: isWarehousePhase ? 'rgba(37,99,235,0.92)' : 'rgba(16,185,129,0.92)' }}
        >
          <span className='h-2 w-2 animate-pulse rounded-full bg-white' />
          {isWarehousePhase ? '📦 Heading to Warehouse' : '🛵 Delivering to Customer'}
        </div>
      )}

      {/* Warehouse current location pill badge */}
      <div className='absolute top-3 right-3 z-[1000] flex items-center gap-1.5 rounded-lg bg-background/95 backdrop-blur-md px-3 py-1 text-xs font-medium text-foreground border border-border shadow-sm'>
        <span className='text-blue-600 font-bold'>🏪 Warehouse:</span>
        <span className='truncate max-w-[150px]'>{warehouseLabel}</span>
      </div>

      {/* No-partner placeholder */}
      {!partnerPos && (
        <div className='absolute inset-0 z-[1000] flex flex-col items-center justify-center bg-muted/80 backdrop-blur-sm'>
          <span className='text-3xl mb-2'>🛵</span>
          <p className='text-sm font-semibold text-muted-foreground'>
            Waiting for delivery partner location…
          </p>
          <p className='text-xs text-muted-foreground mt-1'>
            Map will update live in real time once the partner moves
          </p>
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom
        className='w-full'
        style={{ height: '340px', background: '#eef1ef' }}
        key={`admin-map-${liveWarehousePos.join(',')}`}
      >
        <TileLayer
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Partner marker */}
        {partnerPos && (
          <Marker position={partnerPos} icon={partnerIcon}>
            <Popup>🛵 Delivery Partner</Popup>
          </Marker>
        )}

        {/* Phase 1: Show ONLY Warehouse marker when heading to warehouse */}
        {isWarehousePhase && (
          <Marker position={liveWarehousePos} icon={warehouseIcon}>
            <Popup>
              <div className='font-semibold text-xs'>
                🏪 {warehouseLabel} (Warehouse Hub)
                <div className='text-[10px] text-muted-foreground mt-0.5'>
                  {liveWarehousePos[0].toFixed(4)}, {liveWarehousePos[1].toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Phase 2: Show ONLY Customer drop-off marker when delivering to customer */}
        {!isWarehousePhase && customerPos && (
          <Marker position={customerPos} icon={customerIcon}>
            <Popup>📍 Drop-off: {dropoffLabel}</Popup>
          </Marker>
        )}

        {/* Route polyline - continuous solid line (no dash) */}
        {route.length > 1 && (
          <Polyline
            positions={route}
            color={routeColor}
            weight={6}
            opacity={0.9}
          />
        )}

        <MapController partnerPos={partnerPos} destPos={currentDestPos} />
      </MapContainer>
    </div>
  )
}

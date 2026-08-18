import React, { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Package, CheckCircle2, Truck, AlertCircle, X } from 'lucide-react'
import { io } from 'socket.io-client'

// Leaflet Imports
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// ── Fix Leaflet default icon paths in Vite ──────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const SOCKET_URL = API_BASE.replace('/api', '')
const LOCATIONIQ_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY || ''

// ── Custom Modern Map Icons ──────────────────────────────────────────
const destinationIcon = L.divIcon({
  className: 'custom-destination-marker',
  html: `
    <div style="width: 36px; height: 46px; display: flex; align-items: center; justify-content: center;">
      <svg width="36" height="46" viewBox="0 0 36 46" fill="none">
        <ellipse cx="18" cy="42" rx="9" ry="3.5" fill="#0F172A" fill-opacity="0.25" />
        <path d="M18 2C9.163 2 2 9.163 2 18C2 28.5 15.2 40.2 17.2 41.9C17.6 42.2 18.4 42.2 18.8 41.9C20.8 40.2 34 28.5 34 18C34 9.163 26.837 2 18 2Z" fill="#EF4444" stroke="#FFFFFF" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="18" cy="17" r="5" fill="#FFFFFF" />
      </svg>
    </div>
  `,
  iconSize: [36, 46],
  iconAnchor: [18, 42],
  popupAnchor: [0, -42],
})

const partnerIcon = L.divIcon({
  className: 'custom-partner-marker',
  html: `
    <div style="
      width: 44px; height: 44px; background: #FFFFFF; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
      border: 1px solid rgba(226, 232, 240, 0.9);
    ">
      <svg width="28" height="22" viewBox="0 0 44 34" fill="none">
        <rect x="2" y="2" width="22" height="22" rx="4" stroke="#1E293B" stroke-width="4" stroke-linejoin="round"/>
        <path d="M24 8H32L41 16V24H24V8Z" stroke="#1E293B" stroke-width="4" stroke-linejoin="round"/>
        <line x1="24" y1="15" x2="40" y2="15" stroke="#1E293B" stroke-width="4" stroke-linecap="round"/>
        <circle cx="12" cy="24" r="5" fill="#FFFFFF" stroke="#1E293B" stroke-width="4"/>
        <circle cx="32" cy="24" r="5" fill="#FFFFFF" stroke="#1E293B" stroke-width="4"/>
      </svg>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
})

// ── Helper to fetch & draw real road route ────────────────────────────
async function updateRoadRoute(map, startLatLng, endLatLng, polylineRef) {
  if (!map || !startLatLng || !endLatLng) return

  const [startLat, startLng] = startLatLng
  const [endLat, endLng] = endLatLng

  if (!Number.isFinite(startLat) || !Number.isFinite(startLng) || !Number.isFinite(endLat) || !Number.isFinite(endLng)) {
    return
  }

  const drawFallbackLine = () => {
    const coords = [
      [startLat, startLng],
      [endLat, endLng],
    ]
    if (polylineRef.current) {
      polylineRef.current.setLatLngs(coords)
    } else {
      polylineRef.current = L.polyline(coords, {
        color: '#2563EB',
        weight: 4,
        dashArray: '6, 8',
        opacity: 0.7,
      }).addTo(map)
    }
  }

  if (!LOCATIONIQ_KEY) {
    drawFallbackLine()
    return
  }

  try {
    const url = `https://us1.locationiq.com/v1/directions/driving/${startLng},${startLat};${endLng},${endLat}?key=${LOCATIONIQ_KEY}&geometries=geojson&overview=full`

    const response = await fetch(url)
    const data = await response.json()

    if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
      const roadPath = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])

      if (polylineRef.current) {
        polylineRef.current.setLatLngs(roadPath)
      } else {
        polylineRef.current = L.polyline(roadPath, {
          color: '#2563EB',
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map)
      }
    } else {
      drawFallbackLine()
    }
  } catch (err) {
    console.warn('Road routing fetch failed, falling back to direct line:', err)
    drawFallbackLine()
  }
}

export default function TrackOrder() {
  const { trackingNumber } = useParams()
  const navigate = useNavigate()

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const destinationMarkerRef = useRef(null)
  const partnerMarkerRef = useRef(null)
  const routePolylineRef = useRef(null)
  const socketRef = useRef(null)
  const nearbyShownRef = useRef(false)

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('active')
  const [nearbyBanner, setNearbyBanner] = useState(false)
  const [partnerOnline, setPartnerOnline] = useState(false)

  // Close tracking overlay handler
  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/orders')
    }
  }

  // ── 1. Fetch session on mount ───────────────────────────────────────
  useEffect(() => {
    if (!trackingNumber) return

    async function fetchSession() {
      try {
        const res = await fetch(`${API_BASE}/tracking/${trackingNumber}`)
        if (!res.ok) throw new Error('Tracking not found')
        const data = await res.json()
        if (!data.success) throw new Error(data.error?.message || 'Not found')
        setSession(data.data.session)
        setStatus(data.data.session.status)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [trackingNumber])

  // ── 2. Init Leaflet map after session loads ─────────────────────────
  useEffect(() => {
    if (!session || !mapRef.current || mapInstanceRef.current) return

    const dest = session.destination
    const curr = session.current

    const center =
      curr?.lat && curr?.lng
        ? [curr.lat, curr.lng]
        : dest?.lat && dest?.lng
        ? [dest.lat, dest.lng]
        : [20.5937, 78.9629]

    const map = L.map(mapRef.current, {
      center,
      zoom: 14,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map)

    // Destination marker
    if (dest?.lat && dest?.lng) {
      destinationMarkerRef.current = L.marker([dest.lat, dest.lng], { icon: destinationIcon })
        .addTo(map)
        .bindPopup(`<b>📍 Delivery Address</b><br/>${dest.address || ''}`)
    }

    // Partner marker
    if (curr?.lat && curr?.lng) {
      partnerMarkerRef.current = L.marker([curr.lat, curr.lng], { icon: partnerIcon })
        .addTo(map)
        .bindPopup('<b>🚚 Delivery Partner</b><br/>Live location')
      setPartnerOnline(true)
    }

    // Draw dynamic route line
    if (dest?.lat && dest?.lng && curr?.lat && curr?.lng) {
      updateRoadRoute(map, [curr.lat, curr.lng], [dest.lat, dest.lng], routePolylineRef)

      map.fitBounds(
        L.latLngBounds(
          [dest.lat, dest.lng],
          [curr.lat, curr.lng]
        ).pad(0.3)
      )
    }

    // Force recalculate full screen tile layout
    setTimeout(() => {
      map.invalidateSize()
    }, 200)

    mapInstanceRef.current = map
  }, [session])

  // ── 3. Socket.io — live updates ─────────────────────────────────────
  useEffect(() => {
    if (!trackingNumber || !session) return

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('tracking:subscribe', { trackingNumber })
    })

    socket.on('reconnect', () => {
      socket.emit('tracking:subscribe', { trackingNumber })
    })

    socket.on('tracking:update', (data) => {
      const { lat, lng } = data
      if (!lat || !lng) return

      setPartnerOnline(true)

      const map = mapInstanceRef.current
      if (!map) return

      if (partnerMarkerRef.current) {
        partnerMarkerRef.current.setLatLng([lat, lng])
      } else {
        partnerMarkerRef.current = L.marker([lat, lng], { icon: partnerIcon })
          .addTo(map)
          .bindPopup('<b>🚚 Delivery Partner</b><br/>Live location')
      }

      const dest = session.destination
      if (dest?.lat && dest?.lng) {
        updateRoadRoute(map, [lat, lng], [dest.lat, dest.lng], routePolylineRef)
      }
    })

    socket.on('tracking:nearby', () => {
      if (nearbyShownRef.current) return
      nearbyShownRef.current = true
      setNearbyBanner(true)
      setTimeout(() => setNearbyBanner(false), 8000)
    })

    socket.on('tracking:completed', () => {
      setStatus('completed')
    })

    return () => {
      socket.disconnect()
    }
  }, [trackingNumber, session])

  // ── 4. Cleanup map on unmount ───────────────────────────────────────
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // ── Render States ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#EAE9E5] flex items-center justify-center">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white shadow hover:bg-gray-100 text-gray-700 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1E1E1E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-500">Loading tracking info…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#EAE9E5] flex items-center justify-center p-4">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white shadow hover:bg-gray-100 text-gray-700 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1E1E1E] mb-2">Tracking not found</h2>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={handleClose}
            className="bg-[#1E1E1E] text-white px-5 py-2 rounded-xl text-xs font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (status === 'completed') {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#EAE9E5] flex items-center justify-center p-4">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white shadow hover:bg-gray-100 text-gray-700 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#1E1E1E] mb-2">Order Delivered!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your order #{session?.orderNumber} has been delivered successfully.
          </p>
          <button
            onClick={handleClose}
            className="inline-block bg-[#1E1E1E] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#333] transition-colors"
          >
            Close Tracking
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#EAE9E5] w-screen h-screen flex flex-col overflow-hidden">
      {/* Top Header with Close (X) Button */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0 z-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Truck className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#1E1E1E]">Live Tracking</h1>
              {partnerOnline && (
                <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
                  Live
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-xs text-gray-500 mt-0.5">
              {/* Top line on mobile: Order Number + Tracking Number side-by-side */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-medium sm:font-normal text-gray-800 sm:text-gray-500">
                  Order #{session?.orderNumber}
                </span>
                <span className="text-gray-300">•</span>
                <span className="font-mono text-gray-500 text-[11px] sm:text-xs">
                  {trackingNumber}
                </span>
              </div>

              <span className="hidden sm:inline text-gray-300">•</span>

              {/* Bottom line on mobile: Courier / Delivery partner */}
              <div className="text-gray-500 text-[11px] sm:text-xs">
                {session?.courier}
              </div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="p-2.5 rounded-full hover:bg-gray-100 text-gray-700 transition-colors shrink-0"
          title="Close Tracking"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Nearby banner */}
      {nearbyBanner && (
        <div className="bg-blue-600 text-white text-center py-2.5 px-4 text-xs sm:text-sm font-semibold animate-pulse shrink-0 z-20">
          🚚 Your delivery partner is less than 1km away!
        </div>
      )}

      {/* Map Area — Takes 100% Remaining Height */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        <div ref={mapRef} className="w-full h-full" style={{ height: '100%', width: '100%' }} />

        {/* Legend */}
        <div className="absolute bottom-6 left-4 bg-white/95 backdrop-blur rounded-xl shadow-lg p-3 text-xs space-y-2 z-[1000]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-700 font-medium">Delivery address</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-700 font-medium">Delivery partner</span>
          </div>
        </div>

        {/* Destination Info Floating Card */}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur rounded-xl shadow-lg p-3 max-w-xs z-[1000]">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[#1E1E1E] mb-0.5">Delivering to</p>
              <p className="text-xs text-gray-500 leading-relaxed">{session?.destination?.address}</p>
            </div>
          </div>
        </div>

        {/* Offline / Waiting Partner Overlay */}
        {!partnerOnline && (
          <div className="absolute inset-0 flex items-end justify-center pb-16 pointer-events-none z-[999]">
            <div className="bg-white/95 backdrop-blur rounded-xl shadow-lg px-4 py-3 text-center max-w-xs mx-4">
              <Package className="w-6 h-6 text-gray-400 mx-auto mb-1" />
              <p className="text-xs font-semibold text-gray-700">Partner location pending</p>
              <p className="text-xs text-gray-400 mt-0.5">Map will update when partner starts delivery</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
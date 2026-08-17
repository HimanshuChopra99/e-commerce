/**
 * TrackOrder.jsx
 * Place at: client/src/pages/TrackOrder.jsx
 *
 * Route: /track/:trackingNumber
 * Shows a live Leaflet map with:
 *   - Static red pin  → delivery destination
 *   - Moving blue pin → admin/partner live location (via Socket.io)
 *   - Dynamic route   → Google Maps style path from partner to destination
 */
import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MapPin, Package, CheckCircle2, Truck, AlertCircle } from 'lucide-react'
import { io } from 'socket.io-client'

// Leaflet Imports
import 'leaflet/dist/leaflet.css'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import L from 'leaflet'
import 'leaflet-routing-machine' // Top-level ESM import for Vite

// ── Fix Leaflet's broken default icon paths in Vite ──────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const SOCKET_URL = API_BASE.replace('/api', '')

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

// Helper to initialize or update Google-Maps style path
const updateRoutePath = (map, startLatLng, endLatLng, routingControlRef) => {
  if (!map || !startLatLng || !endLatLng) return

  const waypoints = [
    L.latLng(startLatLng[0], startLatLng[1]),
    L.latLng(endLatLng[0], endLatLng[1]),
  ]

  if (routingControlRef.current) {
    // Dynamically update path when truck moves
    routingControlRef.current.setWaypoints(waypoints)
  } else if (L.Routing) {
    // Initialize Routing Control
    routingControlRef.current = L.Routing.control({
      waypoints,
      lineOptions: {
        styles: [
          { color: '#1E40AF', opacity: 0.25, weight: 9 }, // Soft outer shadow
          { color: '#2563EB', opacity: 1, weight: 5 },    // Main blue path
        ],
        extendToWaypoints: true,
        missingRouteTolerance: 0,
      },
      createMarker: () => null, // Hide default routing markers; custom markers used instead
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      show: false, // Hide turn-by-turn text box
    }).addTo(map)
  }
}

export default function TrackOrder() {
  const { trackingNumber } = useParams()

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const destinationMarkerRef = useRef(null)
  const partnerMarkerRef = useRef(null)
  const routingControlRef = useRef(null)
  const socketRef = useRef(null)
  const nearbyShownRef = useRef(false)

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('active')
  const [nearbyBanner, setNearbyBanner] = useState(false)
  const [partnerOnline, setPartnerOnline] = useState(false)

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

    // Center on destination if partner not yet located, else partner
    const center =
      curr.lat && curr.lng
        ? [curr.lat, curr.lng]
        : dest.lat && dest.lng
        ? [dest.lat, dest.lng]
        : [20.5937, 78.9629] // India center fallback

    const map = L.map(mapRef.current, {
      center,
      zoom: 14,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map)

    // Destination marker — static red pin
    if (dest.lat && dest.lng) {
      destinationMarkerRef.current = L.marker([dest.lat, dest.lng], { icon: destinationIcon })
        .addTo(map)
        .bindPopup(`<b>📍 Delivery Address</b><br/>${dest.address || ''}`)
    }

    // Partner marker — blue truck, only if we have a last known position
    if (curr.lat && curr.lng) {
      partnerMarkerRef.current = L.marker([curr.lat, curr.lng], { icon: partnerIcon })
        .addTo(map)
        .bindPopup('<b>🚚 Delivery Partner</b><br/>Live location')
      setPartnerOnline(true)
    }

    // Draw dynamic route if both destination and current locations exist
    if (dest.lat && dest.lng && curr.lat && curr.lng) {
      updateRoutePath(map, [curr.lat, curr.lng], [dest.lat, dest.lng], routingControlRef)

      // Fit map to show both markers
      map.fitBounds(
        L.latLngBounds(
          [dest.lat, dest.lng],
          [curr.lat, curr.lng]
        ).pad(0.3)
      )
    }

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

    // Re-subscribe on reconnect so we never miss updates after a drop
    socket.on('reconnect', () => {
      socket.emit('tracking:subscribe', { trackingNumber })
    })

    socket.on('tracking:update', (data) => {
      const { lat, lng } = data
      if (!lat || !lng) return

      setPartnerOnline(true)

      const map = mapInstanceRef.current
      if (!map) return

      // Smooth marker movement
      if (partnerMarkerRef.current) {
        partnerMarkerRef.current.setLatLng([lat, lng])
      } else {
        partnerMarkerRef.current = L.marker([lat, lng], { icon: partnerIcon })
          .addTo(map)
          .bindPopup('<b>🚚 Delivery Partner</b><br/>Live location')
      }

      // 🔄 Dynamic Route Update: Update path live as partner moves
      const dest = session.destination
      if (dest?.lat && dest?.lng) {
        updateRoutePath(map, [lat, lng], [dest.lat, dest.lng], routingControlRef)
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

  // ── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className='min-h-screen bg-[#EAE9E5] flex items-center justify-center'>
        <div className='text-center'>
          <div className='w-12 h-12 border-4 border-[#1E1E1E] border-t-transparent rounded-full animate-spin mx-auto mb-4' />
          <p className='text-sm font-bold text-gray-500'>Loading tracking info…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='min-h-screen bg-[#EAE9E5] flex items-center justify-center p-4'>
        <div className='text-center max-w-sm'>
          <AlertCircle className='w-12 h-12 text-red-500 mx-auto mb-4' />
          <h2 className='text-xl font-bold text-[#1E1E1E] mb-2'>Tracking not found</h2>
          <p className='text-gray-500 text-sm'>{error}</p>
        </div>
      </div>
    )
  }

  if (status === 'completed') {
    return (
      <div className='min-h-screen bg-[#EAE9E5] flex items-center justify-center p-4'>
        <div className='text-center max-w-sm'>
          <div className='w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6'>
            <CheckCircle2 className='w-10 h-10 text-green-600' />
          </div>
          <h2 className='text-2xl font-bold text-[#1E1E1E] mb-2'>Order Delivered!</h2>
          <p className='text-gray-500 text-sm mb-6'>
            Your order {session?.orderNumber} has been delivered successfully.
          </p>
          <a
            href='/orders'
            className='inline-block bg-[#1E1E1E] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#333] transition-colors'
          >
            View My Orders
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-[#EAE9E5] flex flex-col'>
      {/* CSS to hide default Leaflet Routing instruction text panel */}
      <style>{`
        .leaflet-routing-container {
          display: none !important;
        }
      `}</style>

      {/* Header */}
      <div className='bg-white border-b border-gray-200 px-4 py-4'>
        <div className='max-w-2xl mx-auto'>
          <div className='flex items-center gap-3 mb-1'>
            <Truck className='w-5 h-5 text-blue-600' />
            <h1 className='text-lg font-bold text-[#1E1E1E]'>Live Tracking</h1>
            {partnerOnline && (
              <span className='flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full'>
                <span className='w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block' />
                Live
              </span>
            )}
          </div>
          <div className='flex items-center gap-4 text-xs text-gray-500'>
            <span>Order {session?.orderNumber}</span>
            <span>•</span>
            <span>{session?.courier}</span>
            <span>•</span>
            <span className='font-mono'>{trackingNumber}</span>
          </div>
        </div>
      </div>

      {/* Nearby banner */}
      {nearbyBanner && (
        <div className='bg-blue-600 text-white text-center py-3 px-4 text-sm font-semibold animate-pulse'>
          🚚 Your delivery partner is less than 1km away!
        </div>
      )}

      {/* Map */}
      <div className='flex-1 relative'>
        <div ref={mapRef} style={{ height: '100%', minHeight: '500px', width: '100%' }} />

        {/* Legend */}
        <div className='absolute bottom-4 left-4 bg-white rounded-xl shadow-lg p-3 text-xs space-y-2 z-[1000]'>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 rounded-full bg-red-500' />
            <span className='text-gray-600'>Delivery address</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-3 h-3 rounded-full bg-blue-500' />
            <span className='text-gray-600'>Delivery partner</span>
          </div>
        </div>

        {/* Destination card */}
        <div className='absolute top-4 right-4 bg-white rounded-xl shadow-lg p-3 max-w-xs z-[1000]'>
          <div className='flex items-start gap-2'>
            <MapPin className='w-4 h-4 text-red-500 mt-0.5 shrink-0' />
            <div>
              <p className='text-xs font-semibold text-[#1E1E1E] mb-0.5'>Delivering to</p>
              <p className='text-xs text-gray-500 leading-relaxed'>{session?.destination?.address}</p>
            </div>
          </div>
        </div>

        {/* No partner yet overlay */}
        {!partnerOnline && (
          <div className='absolute inset-0 flex items-end justify-center pb-20 pointer-events-none z-[999]'>
            <div className='bg-white rounded-xl shadow-lg px-4 py-3 text-center max-w-xs mx-4'>
              <Package className='w-6 h-6 text-gray-400 mx-auto mb-1' />
              <p className='text-xs font-semibold text-gray-700'>Partner location pending</p>
              <p className='text-xs text-gray-400 mt-0.5'>Map will update when partner starts delivery</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
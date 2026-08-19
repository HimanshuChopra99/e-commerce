import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// No markers - just a clean, navigable live map

// Invalidate map size whenever the parent (collapsible) layout changes
function AutoResize({ open }) {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200)
    return () => clearTimeout(t)
  }, [open, map])
  return null
}

// Keep a sensible default view
function SetView() {
  const map = useMap()
  useEffect(() => {
    map.setView({ lat: 23.76, lng: 90.41 }, 13)
  }, [map])
  return null
}

export default function LiveMap({ open }) {
  return (
    <MapContainer
      center={[23.76, 90.41]}
      zoom={13}
      scrollWheelZoom
      className="w-full h-full"
      style={{ height: '100%', width: '100%', background: '#eef1ef' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <AutoResize open={open} />
      <SetView />
    </MapContainer>
  )
}

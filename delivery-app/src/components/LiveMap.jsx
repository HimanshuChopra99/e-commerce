import { useEffect, useState, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { useSelector } from 'react-redux';
import {
  selectActiveOrder,
  selectNavPhase,
  selectWarehouseLocation,
} from '../store/slices/orderSlice';
import { getSocket } from '../lib/socket';
import 'leaflet/dist/leaflet.css';

// Default fallback warehouse coordinates if server hasn't sent any
const DEFAULT_WAREHOUSE_LAT = 30.7333;
const DEFAULT_WAREHOUSE_LNG = 76.7794;

// ── Custom marker icons ───────────────────────────────────────────────────────
const partnerIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    background:linear-gradient(135deg,#8b5cf6,#6d28d9);
    border:3px solid white;
    box-shadow:0 2px 12px rgba(139,92,246,0.55);
    display:flex;align-items:center;justify-content:center;
    font-size:18px;
  ">🛵</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Warehouse icon in BLUE
const warehouseIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:36px;height:36px;border-radius:10px;
    background:linear-gradient(135deg,#3b82f6,#1d4ed8);
    border:3px solid white;
    box-shadow:0 2px 12px rgba(37,99,235,0.55);
    display:flex;align-items:center;justify-content:center;
    font-size:18px;
  ">🏪</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const customerIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:36px;height:36px;border-radius:50%;
    background:linear-gradient(135deg,#10b981,#059669);
    border:3px solid white;
    box-shadow:0 2px 12px rgba(16,185,129,0.55);
    display:flex;align-items:center;justify-content:center;
    font-size:18px;
  ">📍</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

// ── Map pan helper ────────────────────────────────────────────────────────────
function MapController({ partnerPos, destPos, open }) {
  const map = useMap();
  const fittedRef = useRef(false);

  // Invalidate size when bottom-sheet opens/closes
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(t);
  }, [open, map]);

  // Fit bounds when we have both points (only once per destination change)
  useEffect(() => {
    if (!partnerPos || !destPos) return;
    fittedRef.current = false;
  }, [destPos]);

  useEffect(() => {
    if (!partnerPos || !destPos || fittedRef.current) return;
    try {
      const bounds = L.latLngBounds([partnerPos, destPos]).pad(0.25);
      map.fitBounds(bounds, { animate: true, duration: 1 });
      fittedRef.current = true;
    } catch {}
  }, [partnerPos, destPos, map]);

  return null;
}

// ── Fetch a route from OSRM free routing service ─────────────────────────────
async function fetchRoute(from, to) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    const coords = json?.routes?.[0]?.geometry?.coordinates;
    if (!coords) return null;
    // OSRM returns [lng, lat], leaflet wants [lat, lng]
    return coords.map(([lng, lat]) => [lat, lng]);
  } catch {
    return null;
  }
}

export default function LiveMap({ open }) {
  const activeOrder = useSelector(selectActiveOrder);
  const navPhase = useSelector(selectNavPhase);
  const warehouseLoc = useSelector(selectWarehouseLocation);
  const [partnerPos, setPartnerPos] = useState(null);
  const [route, setRoute] = useState([]);
  const routeFetchedRef = useRef(null);

  // Real warehouse coordinates from activeOrder, live warehouseLoc from server, or fallback
  const warehouseLat =
    activeOrder?.pickupLat ?? warehouseLoc?.lat ?? DEFAULT_WAREHOUSE_LAT;
  const warehouseLng =
    activeOrder?.pickupLng ?? warehouseLoc?.lng ?? DEFAULT_WAREHOUSE_LNG;

  // Destination based on nav phase — memoised to keep a stable reference
  const destPos = useMemo(() => {
    if (navPhase === 'to_warehouse') {
      return [Number(warehouseLat), Number(warehouseLng)];
    }
    if (
      activeOrder?.shippingAddress?.lat &&
      activeOrder?.shippingAddress?.lng
    ) {
      return [
        Number(activeOrder.shippingAddress.lat),
        Number(activeOrder.shippingAddress.lng),
      ];
    }
    return null;
  }, [
    navPhase,
    warehouseLat,
    warehouseLng,
    activeOrder?.shippingAddress?.lat,
    activeOrder?.shippingAddress?.lng,
  ]);

  // ── Listen for GPS updates from this partner ────────────────────────
  useEffect(() => {
    // Also try to get initial location immediately from device
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPartnerPos([pos.coords.latitude, pos.coords.longitude]);
        },
        null,
        { enableHighAccuracy: true, timeout: 4000 }
      );
    }

    const socket = getSocket();
    const handler = (data) => {
      const lat = data.lat ?? data.latitude;
      const lng = data.lng ?? data.longitude;
      if (lat && lng) {
        setPartnerPos([lat, lng]);
      }
    };
    socket.on('receive-location', handler);
    return () => socket.off('receive-location', handler);
  }, [partnerPos]);

  // ── Fetch road route whenever partner pos OR destination changes ─────────────
  useEffect(() => {
    if (!partnerPos || !destPos) return;
    const destKey = `${partnerPos.join(',')}-${destPos.join(',')}`;
    if (routeFetchedRef.current === destKey) return;

    routeFetchedRef.current = destKey;
    fetchRoute(partnerPos, destPos).then((r) => {
      if (r) setRoute(r);
      else setRoute([partnerPos, destPos]); // straight-line fallback
    });
  }, [partnerPos, destPos]);

  // Route color: BLUE for warehouse phase, green for customer phase
  const routeColor = navPhase === 'to_warehouse' ? '#2563eb' : '#10b981';

  const defaultCenter = partnerPos ?? destPos ?? [warehouseLat, warehouseLng];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={14}
      scrollWheelZoom
      className="w-full h-full"
      style={{ height: '100%', width: '100%', background: '#eef1ef' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* Partner marker */}
      {partnerPos && (
        <Marker position={partnerPos} icon={partnerIcon}>
          <Popup>📍 You are here</Popup>
        </Marker>
      )}

      {/* Destination marker */}
      {destPos && navPhase === 'to_warehouse' && (
        <Marker position={destPos} icon={warehouseIcon}>
          <Popup>🏪 {activeOrder?.pickupAddress || 'KICKS Warehouse'}</Popup>
        </Marker>
      )}
      {destPos && navPhase === 'to_customer' && (
        <Marker position={destPos} icon={customerIcon}>
          <Popup>
            📦 Drop-off:{' '}
            {[
              activeOrder?.shippingAddress?.city,
              activeOrder?.shippingAddress?.state,
            ]
              .filter(Boolean)
              .join(', ')}
          </Popup>
        </Marker>
      )}

      {/* Route polyline - continuous solid line */}
      {route.length > 1 && (
        <Polyline
          positions={route}
          color={routeColor}
          weight={6}
          opacity={0.9}
        />
      )}

      <MapController partnerPos={partnerPos} destPos={destPos} open={open} />
    </MapContainer>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  selectActiveOrder,
  selectWarehouseLocation,
} from '../store/slices/orderSlice';

const toRad = (d) => (d * Math.PI) / 180;
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1),
    dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const PICKUP_RADIUS = 50;
const DELIVERY_RADIUS = 50;

export function useProximity() {
  const order = useSelector(selectActiveOrder);
  const warehouse = useSelector(selectWarehouseLocation);
  const [nearWarehouse, setNearWarehouse] = useState(false);
  const [nearCustomer, setNearCustomer] = useState(false);
  const [distances, setDistances] = useState({
    warehouse: null,
    customer: null,
  });
  const watchRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const onPos = ({ coords }) => {
      const lat = coords.latitude,
        lng = coords.longitude;
      const wLat = warehouse?.lat ?? order?.pickupLat ?? order?.pickup_lat;
      const wLng = warehouse?.lng ?? order?.pickupLng ?? order?.pickup_lng;
      const dw =
        Number.isFinite(wLat) && Number.isFinite(wLng)
          ? haversineMeters(lat, lng, Number(wLat), Number(wLng))
          : null;
      const cLat = order?.shippingAddress?.lat ?? order?.shippingLat;
      const cLng = order?.shippingAddress?.lng ?? order?.shippingLng;
      const dc =
        Number.isFinite(cLat) && Number.isFinite(cLng)
          ? haversineMeters(lat, lng, Number(cLat), Number(cLng))
          : null;
      setDistances({ warehouse: dw, customer: dc });
      setNearWarehouse(dw !== null && dw <= PICKUP_RADIUS);
      setNearCustomer(dc !== null && dc <= DELIVERY_RADIUS);
    };
    watchRef.current = navigator.geolocation.watchPosition(onPos, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 4000,
      timeout: 10000,
    });
    return () => {
      if (watchRef.current !== null)
        navigator.geolocation.clearWatch(watchRef.current);
    };
    // The effect intentionally tracks order?.id and warehouse coords as stable keys.
    // Listing every nested field (pickupLat, shippingAddress.lat, etc.) would cause
    // the watch to restart on every Redux update, which is undesirable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, warehouse?.lat, warehouse?.lng]);

  return { nearWarehouse, nearCustomer, distances };
}

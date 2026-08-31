import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { getSocket } from '../lib/socket';

const HEARTBEAT_MS = 5000;

export function useLocationHeartbeat() {
  const online = useSelector((s) => s.app.online);
  const partner = useSelector((s) => s.app.partner);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!online || !partner) return;
    const emit = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const socket = getSocket();
          if (!socket?.connected) return;
          socket.emit('delivery:partner_location', {
            orderId: null,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            phase: 'idle',
          });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    };
    emit();
    timerRef.current = setInterval(emit, HEARTBEAT_MS);
    return () => clearInterval(timerRef.current);
  }, [online, partner]);
}

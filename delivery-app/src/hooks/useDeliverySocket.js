import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getSocket, connectSocket } from '../lib/socket';
import { api } from '../lib/api';
import {
  setConnectionState,
  orderBroadcasted,
  orderTakenAway,
  setWarehouseLocation,
} from '../store/slices/orderSlice';

/**
 * Call this hook once in the root App component.
 * It handles:
 *   - Connecting when the partner logs in
 *   - Persisting online/offline status to the DB (real data)
 *   - Joining / leaving the delivery pool room
 *   - Listening for order broadcasts and warehouse location
 */
export function useDeliverySocket() {
  const dispatch = useDispatch();
  const partner = useSelector((s) => s.app.partner);
  const online = useSelector((s) => s.app.online);
  const token = useSelector((s) => s.app.token);

  // Always keep a ref in sync so event handlers can read the latest value
  const onlineRef = useRef(online);
  useEffect(() => {
    onlineRef.current = online;
  });

  // Track whether the initial mount sync has already run.
  // We skip the "emit go_offline" path on the very first render so that a
  // page-refresh doesn't send go_offline before the socket has reconnected.
  const mountedRef = useRef(false);

  // ── Connect + register listeners (once per partner) ──────────────────────
  useEffect(() => {
    if (!partner) return;

    const socket = connectSocket(partner.publicId);

    const onConnect = () => {
      dispatch(setConnectionState('connected'));
      // Re-emit the partner's current status on every (re)connect.
      // This is the authoritative signal that cancels any server-side
      // offline grace-period timer on page refresh.
      if (onlineRef.current) {
        socket.emit('delivery:go_online', {
          partnerPublicId: partner.publicId,
        });
      } else {
        socket.emit('delivery:go_offline', {
          partnerPublicId: partner.publicId,
        });
      }
    };

    socket.on('connect', onConnect);

    socket.on('disconnect', () => {
      dispatch(setConnectionState('disconnected'));
      // Do NOT dispatch setOnline(false) here — the server has a grace
      // period so a page-refresh won't permanently mark the partner offline.
    });

    socket.on('order:ready_for_pickup', (data) => {
      dispatch(orderBroadcasted(data));
    });

    socket.on('order:assigned_away', (data) => {
      dispatch(orderTakenAway(data));
    });

    socket.on('warehouse:location', (data) => {
      if (data) dispatch(setWarehouseLocation(data));
    });

    socket.on('warehouse:location_updated', (data) => {
      if (data) dispatch(setWarehouseLocation(data));
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect');
      socket.off('order:ready_for_pickup');
      socket.off('order:assigned_away');
      socket.off('warehouse:location');
      socket.off('warehouse:location_updated');
    };
  }, [partner, dispatch]);

  // ── Sync online/offline to server when the user EXPLICITLY toggles ────────
  // We skip the very first execution (mount) so that the initial state
  // restored from localStorage doesn't trigger a spurious go_offline call
  // before the socket connection is even established. The onConnect handler
  // above handles the initial sync instead.
  useEffect(() => {
    if (!partner || !token) return;

    if (!mountedRef.current) {
      // First render after login / refresh — let onConnect handle the sync
      mountedRef.current = true;
      return;
    }

    // User explicitly toggled — sync to server immediately
    const socket = getSocket();
    if (socket.connected) {
      if (online) {
        socket.emit('delivery:go_online', {
          partnerPublicId: partner.publicId,
        });
      } else {
        socket.emit('delivery:go_offline', {
          partnerPublicId: partner.publicId,
        });
      }
    }

    // Also persist to DB via REST so the admin dashboard reflects it
    api
      .patch('/delivery-partner/me/online', { isOnline: online }, token)
      .catch(() => {});
  }, [online, partner, token]);
}

import { createSlice } from '@reduxjs/toolkit';

const ORDER_STORAGE_KEY = 'dp_active_order';
const COMPLETED_STORAGE_KEY = 'dp_completed_order';

function loadActiveOrder() {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveActiveOrder(data) {
  try {
    if (data) {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(ORDER_STORAGE_KEY);
    }
  } catch {}
}

function loadCompletedOrder() {
  try {
    const raw = localStorage.getItem(COMPLETED_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCompletedOrder(data) {
  try {
    if (data) {
      localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(data));
    }
  } catch {}
}

const persisted = loadActiveOrder();

const initialState = {
  availableOrders: [], // orders broadcast from server (ready_for_pickup)
  activeOrder: persisted?.activeOrder ?? null, // the order this partner has accepted and is delivering
  activeTrackingNumber: persisted?.activeTrackingNumber ?? null,
  navPhase: persisted?.navPhase ?? null, // 'to_warehouse' | 'to_customer' | null
  completedOrder: loadCompletedOrder(),
  connectionState: 'disconnected', // 'connected' | 'disconnected'
  hasNewOrders: false, // unread indicator flag for bottom nav
  rejectedOrderIds: [], // session-local blocklist: rejected orders never reappear until manual refresh
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    setConnectionState: (state, action) => {
      state.connectionState = action.payload;
    },
    orderBroadcasted: (state, action) => {
      // Skip if this partner already rejected this order in this session
      if (state.rejectedOrderIds.includes(action.payload.orderId)) return;
      // Add to available list if not already there
      const exists = state.availableOrders.find(
        (o) => o.id === action.payload.orderId
      );
      if (!exists) {
        state.availableOrders.push({
          id: action.payload.orderId,
          orderNumber: action.payload.orderNumber,
          pickupAddress: action.payload.pickupAddress || 'KICKS Main Hub',
          pickupLat: action.payload.pickupLat,
          pickupLng: action.payload.pickupLng,
          dropoffAddress: action.payload.dropoffAddress,
          shippingAddress: action.payload.shippingAddress,
          customerName: action.payload.customerName,
          itemCount: action.payload.itemCount,
          total: action.payload.total,
          distance: action.payload.distance,
          eta: action.payload.eta,
          payout: action.payload.payout,
          status: 'ready_for_pickup',
        });
      }
      state.hasNewOrders = true;
    },
    setAvailableOrders: (state, action) => {
      const incoming = action.payload || [];
      // Strip any orders this partner has already rejected in this session
      const filtered = incoming.filter(
        (o) => !state.rejectedOrderIds.includes(o.id || o.orderId)
      );
      if (filtered.length > 0 && state.availableOrders.length === 0) {
        state.hasNewOrders = true;
      }
      state.availableOrders = filtered;
    },
    markOrdersSeen: (state) => {
      state.hasNewOrders = false;
    },
    setWarehouseLocation: (state, action) => {
      state.warehouseLocation = action.payload;
    },
    orderTakenAway: (state, action) => {
      // Remove from available list — someone else got it OR partner rejected it
      state.availableOrders = state.availableOrders.filter(
        (o) => o.id !== action.payload.orderId
      );
      // Add to session blocklist so it never reappears via socket or re-fetch
      if (
        action.payload.orderId &&
        !state.rejectedOrderIds.includes(action.payload.orderId)
      ) {
        state.rejectedOrderIds.push(action.payload.orderId);
      }
    },
    // Call this only on explicit manual refresh — clears the rejected blocklist
    clearRejectedOrders: (state) => {
      state.rejectedOrderIds = [];
    },
    acceptOrderSuccess: (state, action) => {
      // Move to activeOrder, clear available list, set nav phase
      const foundInAvailable = state.availableOrders.find(
        (o) =>
          o.id === (action.payload?.id || action.payload?.publicId) ||
          o.orderNumber === action.payload?.orderNumber
      );
      const enrichedOrder = {
        ...foundInAvailable,
        ...action.payload,
        id:
          action.payload?.id ||
          action.payload?.publicId ||
          foundInAvailable?.id,
        orderNumber:
          action.payload?.orderNumber ||
          foundInAvailable?.orderNumber ||
          action.payload?.id,
        customerName:
          action.payload?.customerName ||
          foundInAvailable?.customerName ||
          'Customer',
        pickupAddress:
          action.payload?.pickupAddress ||
          foundInAvailable?.pickupAddress ||
          'KICKS Main Hub',
        pickupLat:
          action.payload?.pickupLat ??
          foundInAvailable?.pickupLat ??
          state.warehouseLocation?.lat,
        pickupLng:
          action.payload?.pickupLng ??
          foundInAvailable?.pickupLng ??
          state.warehouseLocation?.lng,
        dropoffAddress:
          foundInAvailable?.dropoffAddress ||
          [
            action.payload?.shippingAddress?.city,
            action.payload?.shippingAddress?.state,
          ]
            .filter(Boolean)
            .join(', ') ||
          'Customer Location',
        shippingAddress:
          action.payload?.shippingAddress || foundInAvailable?.shippingAddress,
        distance:
          foundInAvailable?.distance || action.payload?.distance || '2.8 km',
        eta: foundInAvailable?.eta || action.payload?.eta || '12 min',
        payout:
          foundInAvailable?.payout ||
          action.payload?.payout ||
          Number((Number(action.payload?.total || 0) * 0.08).toFixed(2)) ||
          10,
        total: action.payload?.total ?? foundInAvailable?.total,
        itemCount:
          action.payload?.itemCount ??
          foundInAvailable?.itemCount ??
          (action.payload?.items?.length || 1),
      };
      state.activeOrder = enrichedOrder;
      state.availableOrders = [];
      state.navPhase = 'to_warehouse';
      saveActiveOrder({
        activeOrder: enrichedOrder,
        activeTrackingNumber: null,
        navPhase: 'to_warehouse',
      });
    },
    setTrackingNumber: (state, action) => {
      state.activeTrackingNumber = action.payload;
      saveActiveOrder({
        activeOrder: state.activeOrder,
        activeTrackingNumber: action.payload,
        navPhase: state.navPhase,
      });
    },
    pickedUpOrder: (state) => {
      // Phase 2: now navigating to customer
      state.navPhase = 'to_customer';
      saveActiveOrder({
        activeOrder: state.activeOrder,
        activeTrackingNumber: state.activeTrackingNumber,
        navPhase: 'to_customer',
      });
    },
    deliveredOrder: (state, action) => {
      const finished = action.payload || state.activeOrder;
      state.completedOrder = finished;
      state.activeOrder = null;
      state.activeTrackingNumber = null;
      state.navPhase = null;
      saveActiveOrder(null);
      saveCompletedOrder(finished);
    },
    clearCompleted: (state) => {
      state.completedOrder = null;
    },
  },
});

export const {
  setConnectionState,
  orderBroadcasted,
  setAvailableOrders,
  setWarehouseLocation,
  orderTakenAway,
  acceptOrderSuccess,
  setTrackingNumber,
  pickedUpOrder,
  deliveredOrder,
  clearCompleted,
  markOrdersSeen,
  clearRejectedOrders,
} = orderSlice.actions;

export const selectAvailableOrders = (s) => s.order.availableOrders;
export const selectActiveOrder = (s) => s.order.activeOrder;
export const selectNavPhase = (s) => s.order.navPhase;
export const selectTrackingNumber = (s) => s.order.activeTrackingNumber;
export const selectCompletedOrder = (s) => s.order.completedOrder;
export const selectWarehouseLocation = (s) => s.order.warehouseLocation;
export const selectHasNewOrders = (s) => s.order.hasNewOrders;

export default orderSlice.reducer;

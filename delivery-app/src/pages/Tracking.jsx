import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Icon from '../components/Icon';
import LiveMap from '../components/LiveMap';
import {
  selectActiveOrder,
  selectNavPhase,
  selectTrackingNumber,
  setTrackingNumber,
  pickedUpOrder,
  deliveredOrder,
} from '../store/slices/orderSlice';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useProximity } from '../hooks/useProximity';

export default function Tracking() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const order = useSelector(selectActiveOrder);
  const navPhase = useSelector(selectNavPhase);
  const trackingNumber = useSelector(selectTrackingNumber);
  const token = useSelector((s) => s.app.token);
  const partner = useSelector((s) => s.app.partner);

  const { nearWarehouse, nearCustomer, distances } = useProximity();
  const canPickUp = navPhase === 'to_warehouse' && nearWarehouse;
  const canDeliver = navPhase === 'to_customer' && nearCustomer;

  const [open, setOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [loadingPickup, setLoadingPickup] = useState(false);

  // Guard: If no active order and not completing, redirect to orders
  if (!order && !isCompleting) {
    return <Navigate to="/orders" replace />;
  }

  const handlePickedUp = async () => {
    if (loadingPickup) return;
    setLoadingPickup(true);
    try {
      const updated = await api.post(
        `/delivery-partner/orders/${order.id || order.publicId}/pickup`,
        {},
        token
      );
      dispatch(pickedUpOrder());
      const socket = getSocket();
      const tNum = updated?.trackingNumber || updated?.tracking_number;
      if (tNum) {
        dispatch(setTrackingNumber(tNum));
        // Join the nav room so admin/user can watch the live map
        socket.emit('delivery:join_nav', {
          trackingNumber: tNum,
          partnerPublicId: partner?.publicId,
        });
        // Let admin know phase changed to shipping
        socket.emit('order:phase_changed', {
          orderId: order.id,
          phase: 'to_customer',
          trackingNumber: tNum,
        });
      }
    } catch (err) {
      alert(err.message || 'Failed to mark as picked up');
    } finally {
      setLoadingPickup(false);
    }
  };

  const handleDelivered = async () => {
    try {
      setIsCompleting(true);
      const orderPublicId = order.id || order.publicId;
      await api.post(
        `/delivery-partner/orders/${orderPublicId}/deliver`,
        {},
        token
      );
      const socket = getSocket();
      if (trackingNumber) {
        socket.emit('send-delivery-completed', { trackingNumber });
        socket.emit('delivery:leave_nav', { trackingNumber });
      }
      socket.emit('order:phase_changed', {
        orderId: orderPublicId,
        phase: 'delivered',
        trackingNumber,
      });
      dispatch(deliveredOrder(order));
      navigate('/order-complete', { replace: true, state: { order } });
    } catch (err) {
      setIsCompleting(false);
      alert(err.message || 'Failed to complete delivery');
    }
  };

  const orderIdDisplay = order?.orderNumber || order?.id || '---';
  const addr = order?.shippingAddress || {};
  const dropoffDisplay =
    [addr.city, addr.state].filter(Boolean).join(', ') || 'Customer Address';
  const customerName = order?.customerName || order?.customer_name || null;

  const isWarehousePhase = navPhase === 'to_warehouse';

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-background text-on-background relative">
      {/* ===== TopAppBar ===== */}
      <header className="flex justify-between items-center w-full px-margin-mobile h-14 bg-surface/95 backdrop-blur dark:bg-on-background z-20 relative border-b border-surface-container-highest shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-all duration-200 active:opacity-70 text-on-surface-variant"
        >
          <Icon name="arrow_back" />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-title-md font-bold text-on-surface">
            {isWarehousePhase ? 'Go to Warehouse' : 'Deliver Order'}
          </h1>
          <span className="text-label-sm text-on-surface-variant">
            {orderIdDisplay}
          </span>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-all duration-200 active:opacity-70 text-on-surface-variant">
          <Icon name="more_horiz" />
        </button>
      </header>

      {/* ===== Map (fills remaining space) ===== */}
      <div className="flex-1 relative z-0 min-h-0">
        <LiveMap open={open} />

        {/* Map controls */}
        <div className="absolute right-margin-mobile top-margin-mobile flex flex-col gap-sm z-[1000]">
          <button className="w-12 h-12 bg-surface-container-lowest rounded-full shadow-lg flex items-center justify-center text-on-surface hover:bg-surface-container-low transition-colors">
            <Icon name="my_location" />
          </button>
          <button className="w-12 h-12 bg-surface-container-lowest rounded-full shadow-lg flex items-center justify-center text-on-surface hover:bg-surface-container-low transition-colors">
            <Icon name="layers" />
          </button>
        </div>

        {/* Phase status chip */}
        <div
          className="absolute left-margin-mobile top-margin-mobile z-[1000] backdrop-blur-md px-sm py-1.5 rounded-full border shadow-sm flex items-center gap-1.5"
          style={{
            background: isWarehousePhase
              ? 'rgba(37,99,235,0.92)'
              : 'rgba(16,185,129,0.92)',
            borderColor: isWarehousePhase ? '#1d4ed8' : '#059669',
          }}
        >
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-label-sm font-bold text-white">
            {isWarehousePhase
              ? '📦 Head to Warehouse'
              : '🛵 Deliver to Customer'}
          </span>
        </div>

        {/* Phase progress bar (top) */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-surface-container-highest z-[1000]">
          <div
            className="h-full transition-all duration-700 ease-in-out"
            style={{
              width: isWarehousePhase ? '50%' : '100%',
              background: isWarehousePhase ? '#2563eb' : '#10b981',
            }}
          />
        </div>
      </div>

      {/* ===== Bottom Sheet ===== */}
      <div className="relative z-20 w-full bg-surface-container-lowest rounded-t-[24px] shadow-[0px_-4px_24px_rgba(0,0,0,0.10)] shrink-0">
        {/* Drag handle */}
        <button
          onClick={() => setOpen(!open)}
          aria-label="Toggle delivery details"
          className="w-full flex justify-center pt-2.5 pb-1.5 active:opacity-70 transition-transform duration-200 active:scale-x-95"
        >
          <div className="w-10 h-1 bg-outline-variant rounded-full" />
        </button>

        {/* Collapsed view */}
        <button
          onClick={() => setOpen(true)}
          className={`w-full px-margin-mobile text-left transition-all duration-300 ease-in-out ${
            open ? 'max-h-0 opacity-0 overflow-hidden py-0' : 'max-h-24 pb-4'
          }`}
        >
          <div className="flex items-center gap-sm">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: isWarehousePhase ? '#dbeafe' : '#d1fae5' }}
            >
              <span className="text-xl">{isWarehousePhase ? '🏪' : '📍'}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-body-lg font-bold text-on-surface truncate">
                Order {orderIdDisplay}
              </p>
              <p
                className="text-label-sm font-semibold flex items-center gap-1"
                style={{ color: isWarehousePhase ? '#1d4ed8' : '#059669' }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: isWarehousePhase ? '#2563eb' : '#10b981',
                  }}
                />
                {isWarehousePhase
                  ? 'Phase 1 — Pickup from Warehouse'
                  : 'Phase 2 — Deliver to Customer'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className="text-label-sm text-on-surface-variant">
                Items{' '}
                <span className="font-bold text-on-surface">
                  {order?.itemCount ?? '—'}
                </span>
              </span>
              <span className="text-label-sm text-on-surface-variant">
                Total{' '}
                <span className="font-bold text-primary">
                  ${order?.total ?? 0}
                </span>
              </span>
            </div>
          </div>
        </button>

        {/* Expanded content */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-margin-mobile pb-5">
              <div className="flex flex-col gap-md">
                {/* Order header */}
                <div className="flex items-center gap-md">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: isWarehousePhase ? '#dbeafe' : '#d1fae5',
                    }}
                  >
                    <span className="text-2xl">
                      {isWarehousePhase ? '🏪' : '📦'}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-headline-md text-on-surface mb-0.5">
                      Order {orderIdDisplay}
                    </h2>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{
                          background: isWarehousePhase ? '#2563eb' : '#10b981',
                        }}
                      />
                      <span className="text-body-md text-on-surface-variant">
                        {isWarehousePhase
                          ? 'Phase 1: Heading to Warehouse'
                          : 'Phase 2: Delivering to Customer'}
                      </span>
                    </div>
                  </div>
                </div>

                <hr className="border-outline-variant opacity-30" />

                {/* Route */}
                <div className="bg-surface-container-low rounded-2xl p-sm flex flex-col gap-xs">
                  {/* Pickup */}
                  <div className="flex items-center gap-xs">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-blue-600 text-[16px]">
                        storefront
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-label-xs text-on-surface-variant uppercase tracking-wider">
                        Pickup Warehouse
                      </span>
                      <span className="text-body-md text-on-surface font-semibold truncate">
                        {order?.pickupAddress || 'KICKS Main Hub'}
                      </span>
                    </div>
                    {isWarehousePhase && (
                      <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider shrink-0">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="border-l-2 border-outline-variant ml-4 h-3" />
                  {/* Drop-off */}
                  <div className="flex items-center gap-xs">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-emerald-600 text-[16px]">
                        location_on
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-label-xs text-emerald-600 uppercase tracking-wider">
                        Customer Drop-off
                      </span>
                      <span className="text-body-md text-on-surface font-semibold truncate">
                        {dropoffDisplay}
                      </span>
                      {customerName && (
                        <span className="text-label-xs text-on-surface-variant truncate">
                          {customerName}
                        </span>
                      )}
                    </div>
                    {!isWarehousePhase && (
                      <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wider shrink-0">
                        Current
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                {isWarehousePhase ? (
                  <button
                    onClick={handlePickedUp}
                    disabled={loadingPickup || !canPickUp}
                    className={`w-full h-12 rounded-full flex items-center justify-center gap-xs shadow-md active:scale-95 duration-150 font-bold text-white transition-colors ${canPickUp ? '' : 'opacity-40 cursor-not-allowed'}`}
                    style={{
                      background:
                        loadingPickup || !canPickUp
                          ? '#9ca3af'
                          : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    }}
                  >
                    {loadingPickup ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">
                        package_2
                      </span>
                    )}
                    <span className="text-label-lg">
                      {loadingPickup
                        ? 'Confirming…'
                        : canPickUp
                          ? 'Picked Up — I Have The Order'
                          : `Head to warehouse · ${distances.warehouse != null ? (distances.warehouse / 1000).toFixed(2) + ' km away' : 'GPS…'}`}
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={handleDelivered}
                    disabled={isCompleting || !canDeliver}
                    className={`w-full h-12 rounded-full flex items-center justify-center gap-xs shadow-md active:scale-95 duration-150 font-bold text-white transition-colors ${canDeliver ? '' : 'opacity-40 cursor-not-allowed'}`}
                    style={{
                      background:
                        isCompleting || !canDeliver
                          ? '#9ca3af'
                          : 'linear-gradient(135deg, #10b981, #059669)',
                    }}
                  >
                    {isCompleting ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-[20px]">
                        check_circle
                      </span>
                    )}
                    <span className="text-label-lg">
                      {isCompleting
                        ? 'Completing…'
                        : canDeliver
                          ? 'Mark as Delivered'
                          : `Deliver to customer · ${distances.customer != null ? (distances.customer / 1000).toFixed(2) + ' km away' : 'GPS…'}`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

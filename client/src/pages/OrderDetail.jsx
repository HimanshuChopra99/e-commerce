import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  CreditCard,
  Printer,
  ExternalLink,
  Calendar,
  AlertCircle,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import { fetchMyOrders } from '../store/ordersSlice';
import { ordersApi } from '../lib/api';

const IMAGE_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : '';

function imageSrc(image) {
  if (!image)
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80';
  return image.startsWith('http') ? image : `${IMAGE_BASE}${image}`;
}

function money(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

const statusConfig = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    stepIndex: 1,
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    stepIndex: 2,
  },
  shipped: {
    label: 'In Transit',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
    stepIndex: 3,
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    stepIndex: 4,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    stepIndex: 0,
  },
  returned: {
    label: 'Returned',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    stepIndex: 0,
  },
};

// Generates dynamic stamp information with rich metadata
function getStampConfig(order) {
  const orderStatus = (order.status || '').toLowerCase();
  const paymentStatus = (order.paymentStatus || '').toLowerCase();

  const formattedDate = new Date(order.placedAt || order.createdAt)
    .toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase();

  const refCode = (order.orderNumber || order.id || '')
    .toString()
    .replace('#', '')
    .slice(-6)
    .toUpperCase();

  let text = 'PAID';
  let color = 'border-emerald-600/90 text-emerald-700 bg-emerald-500/5';

  if (orderStatus === 'cancelled') {
    text = 'CANCELLED';
    color = 'border-rose-600/90 text-rose-700 bg-rose-500/5';
  } else if (orderStatus === 'returned') {
    text = 'RETURNED';
    color = 'border-slate-600/90 text-slate-700 bg-slate-500/5';
  } else if (
    orderStatus === 'pending' ||
    paymentStatus === 'pending' ||
    paymentStatus === 'unpaid'
  ) {
    text = 'UNPAID';
    color = 'border-amber-600/90 text-amber-700 bg-amber-500/5';
  }

  return {
    text,
    color,
    company: 'KICKS STORE',
    date: formattedDate,
    ref: refCode,
  };
}

export default function OrderDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    items: orders,
    loading,
    error,
  } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);

  const [directOrder, setDirectOrder] = useState(null);
  const [directLoading, setDirectLoading] = useState(false);

  // Fetch orders if state is not initialized or user refreshed page directly
  useEffect(() => {
    if (user && orders.length === 0) {
      dispatch(fetchMyOrders());
    }
  }, [user, orders.length, dispatch]);

  // Find exact order matching URL parameter from Redux store
  const reduxOrder = orders.find(
    (o) =>
      String(o.id) === String(id) ||
      String(o.publicId) === String(id) ||
      String(o.orderNumber) === String(id) ||
      String(o.orderNumber || '').replace('#', '') ===
        String(id).replace('#', '')
  );

  const order = reduxOrder || directOrder;

  // Fallback: If order is not found in Redux state yet, fetch directly from API
  useEffect(() => {
    if (user && !reduxOrder && id) {
      setDirectLoading(true);
      ordersApi
        .getOne(id)
        .then((res) => {
          if (res?.data) {
            setDirectOrder(res.data);
          }
        })
        .catch(() => {})
        .finally(() => {
          setDirectLoading(false);
        });
    }
  }, [user, reduxOrder, id]);

  const isLoading =
    (loading && orders.length === 0) || (directLoading && !order);

  if (isLoading) {
    return (
      <div className="min-h-[75vh] bg-white py-20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="size-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">
            Loading order details...
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[75vh] bg-white py-20 flex items-center justify-center">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Order Not Found
          </h2>
          <p className="mt-1.5 text-xs text-slate-500">
            We couldn't locate any order matching reference #{id}.
          </p>
          <button
            onClick={() => navigate('/orders')}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            <ArrowLeft className="size-3.5" /> Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const status = statusConfig[order.status] || statusConfig.processing;
  const stamp = getStampConfig(order);
  const orderItems = order.items || [];

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-24 pt-6 sm:pt-10">
      {/* REALISTIC RUBBER STAMP SLAM ANIMATION */}
      <style>{`
        @keyframes stampSlam {
          0% {
            opacity: 0;
            transform: scale(3.5) rotate(28deg) translateY(-110px);
          }
          65% {
            opacity: 0.95;
            transform: scale(0.92) rotate(-14deg) translateY(0);
          }
          80% {
            transform: scale(1.08) rotate(-10deg);
          }
          100% {
            opacity: 0.92;
            transform: scale(1) rotate(-12deg);
          }
        }

        .animate-stamp-slam {
          opacity: 0;
          animation: stampSlam 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.25s forwards;
        }
      `}</style>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-10">
        {/* HEADER & TOP ACTIONS */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
              <Link to="/profile" className="hover:text-slate-900 transition">
                Account
              </Link>
              <span>/</span>
              <Link to="/orders" className="hover:text-slate-900 transition">
                Orders
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-semibold">
                #{order.orderNumber || order.id}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl tracking-tight">
                Order #{order.orderNumber || order.id}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${status.className}`}
              >
                <span className={`size-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <Calendar className="size-3.5 text-slate-400" /> Placed on{' '}
              {new Date(order.placedAt || order.createdAt).toLocaleDateString(
                undefined,
                { dateStyle: 'long' }
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 transition"
            >
              <Printer className="size-3.5 text-slate-500" /> Print Receipt
            </button>
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              <ArrowLeft className="size-3.5" /> All Orders
            </Link>
          </div>
        </div>

        {/* 1. TOP SECTION: DELIVERY PROGRESS BAR & TRACK LIVE BUTTON */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Shipment Status
            </h2>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Live Tracking Button - Shows only when shipped & tracking number exists */}
              {order.status === 'shipped' && order.trackingNumber && (
                <Link
                  to={`/track/${order.trackingNumber}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider shadow-sm shadow-blue-500/20 transition"
                >
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex size-2 rounded-full bg-white"></span>
                  </span>
                  <Truck className="size-3.5" />
                  Track Live
                </Link>
              )}

              {order.trackingNumber && (
                <span className="text-xs font-mono font-medium text-slate-600 bg-slate-50 px-3 py-1 rounded-md border border-slate-200">
                  {order.courier || 'Tracking'}: {order.trackingNumber}
                </span>
              )}
            </div>
          </div>
          <div className="py-4 px-2 border-y border-slate-100">
            <OrderProgressStep currentStep={status.stepIndex} />
          </div>
        </div>

        {/* 2. MAIN GRID: LEFT (PRODUCTS & SHIPPING) + RIGHT (INVOICE SLIP) */}
        <div className="grid gap-10 lg:grid-cols-3 items-start">
          {/* LEFT COLUMN: PRODUCTS & DELIVERY DETAILS (Span 2) */}
          <div className="lg:col-span-2 space-y-10">
            {/* PRODUCTS LIST */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Items Ordered ({orderItems.length})
                </h3>
                <span className="text-xs font-medium text-slate-400">
                  Item Details
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {orderItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={imageSrc(item.image || item.productImage)}
                        alt={item.name || item.productName}
                        className="size-16 shrink-0 rounded-lg border border-slate-200 object-cover bg-slate-50"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="min-w-0">
                        <Link
                          to={
                            item.slug
                              ? `/product/${item.slug}`
                              : `/product/${item.productId || ''}`
                          }
                          className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition inline-flex items-center gap-1.5"
                        >
                          {item.name || item.productName}
                          <ExternalLink className="size-3 text-slate-400" />
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                            Size: {item.size}
                          </span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                            Color: {item.color}
                          </span>
                          <span>Qty: {item.quantity}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right pl-4 shrink-0">
                      <p className="text-sm font-bold text-slate-900">
                        {money(
                          item.lineTotal || item.unitPrice,
                          order.currency
                        )}
                      </p>
                      {item.quantity > 1 && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {money(item.unitPrice, order.currency)} each
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SHIPPING & LOGISTICS DETAILS */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-3 mb-6">
                Delivery & Shipping Information
              </h3>

              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <MapPin className="size-4 text-slate-400" /> Destination
                    Address
                  </div>
                  {order.shippingAddress ? (
                    <div className="text-xs text-slate-600 leading-relaxed font-medium pl-6 border-l-2 border-slate-200">
                      <p className="font-bold text-slate-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p>{order.shippingAddress.line1}</p>
                      {order.shippingAddress.line2 && (
                        <p>{order.shippingAddress.line2}</p>
                      )}
                      <p>
                        {order.shippingAddress.city},{' '}
                        {order.shippingAddress.state}{' '}
                        {order.shippingAddress.postalCode}
                      </p>
                      <p>{order.shippingAddress.country}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 pl-6">
                      Standard profile address assigned.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <Truck className="size-4 text-slate-400" /> Logistics &
                    Shipping Method
                  </div>
                  <div className="text-xs text-slate-600 leading-relaxed space-y-1.5 pl-6 border-l-2 border-slate-200">
                    <p className="flex justify-between">
                      <span className="text-slate-400">Carrier Service:</span>
                      <span className="font-semibold text-slate-900">
                        {order.courier || 'Express Ground'}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Tracking Number:</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {order.trackingNumber || 'Awaiting Pickup'}
                      </span>
                    </p>
                    <p className="flex justify-between items-center">
                      <span className="text-slate-400">
                        Fulfillment Status:
                      </span>
                      {order.status === 'shipped' && order.trackingNumber ? (
                        <Link
                          to={`/track/${order.trackingNumber}`}
                          className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Live Radar Active <ExternalLink className="size-3" />
                        </Link>
                      ) : (
                        <span className="font-semibold text-emerald-700">
                          Insured Package
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: BILL RECEIPT INVOICE SLIP (Span 1) */}
          <div className="lg:col-span-1 space-y-6">
            {/* REALISTIC THERMAL RECEIPT SLIP */}
            <div className="relative mx-auto w-full max-w-sm rounded-t-xl bg-white p-6 pb-8 shadow-xl border border-neutral-200/80 text-neutral-800 font-mono text-xs overflow-hidden sm:overflow-visible">
              {/* DETAILED OFFICIAL RUBBER STAMP */}
              <div
                className={`animate-stamp-slam absolute top-4 right-3 z-20 p-1 border-2 rounded-md ${stamp.color} select-none pointer-events-none shadow-xs`}
              >
                <div className="border border-dashed border-current p-1.5 text-center flex flex-col items-center">
                  <span className="text-[7px] font-extrabold uppercase tracking-widest leading-none mb-0.5 opacity-80">
                    {stamp.company} · VERIFIED
                  </span>
                  <span className="text-base font-black uppercase tracking-widest leading-none py-0.5 px-2">
                    {stamp.text}
                  </span>
                  <div className="text-[7px] font-bold tracking-wider border-t border-current/30 pt-0.5 mt-0.5 w-full flex justify-between gap-3 opacity-90">
                    <span>DATE: {stamp.date}</span>
                    <span>REF: #{stamp.ref}</span>
                  </div>
                </div>
              </div>

              {/* Receipt Store Header */}
              <div className="text-center border-b-2 border-dashed border-neutral-300 pb-4 mb-4 space-y-1">
                <h2 className="font-sans font-black text-lg tracking-wider uppercase text-neutral-900">
                  KICKS STORE
                </h2>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest">
                  Official Purchase Receipt
                </p>
                <p className="text-[10px] text-neutral-400">
                  123 SNEAKER WAY, NEW YORK, NY 10001
                </p>
                <p className="text-[10px] text-neutral-400">
                  TEL: +1 (800) 555-KICK · TAX ID: US-998234
                </p>
              </div>

              {/* Receipt Transaction Metadata */}
              <div className="space-y-1.5 border-b-2 border-dashed border-neutral-300 pb-4 mb-4 text-[11px] text-neutral-600">
                <div className="flex justify-between">
                  <span className="text-neutral-400 uppercase">
                    Receipt No:
                  </span>
                  <span className="font-bold text-neutral-900">
                    #{order.orderNumber || order.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 uppercase">
                    Date & Time:
                  </span>
                  <span className="font-medium text-neutral-800">
                    {new Date(
                      order.placedAt || order.createdAt
                    ).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 uppercase">Payment:</span>
                  <span className="font-medium text-neutral-800">
                    {order.paymentMethod || 'STRIPE / CARD'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400 uppercase">Customer:</span>
                  <span className="font-medium text-neutral-800 truncate max-w-[130px]">
                    {user?.email || 'GUEST USER'}
                  </span>
                </div>
              </div>

              {/* Itemized Line Items Breakdown */}
              <div className="border-b-2 border-dashed border-neutral-300 pb-4 mb-4 space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  <span>QTY / ITEM</span>
                  <span>AMOUNT</span>
                </div>

                {(order.items || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-start text-[11px] gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-neutral-900 truncate uppercase">
                        {item.quantity}x {item.name || item.productName}
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        SIZE: {item.size} | COLOR: {item.color}
                      </p>
                    </div>
                    <span className="font-bold text-neutral-900 shrink-0">
                      {money(item.lineTotal || item.unitPrice, order.currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Financial Calculation */}
              <div className="space-y-1.5 text-[11px] text-neutral-600 border-b-2 border-dashed border-neutral-300 pb-4 mb-4">
                <div className="flex justify-between">
                  <span className="text-neutral-400 uppercase">SUBTOTAL</span>
                  <span className="font-medium text-neutral-900">
                    {money(
                      order.subtotal || (order.total || order.grandTotal) * 0.9,
                      order.currency
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-neutral-400 uppercase">
                    SHIPPING & HANDLING
                  </span>
                  <span className="font-medium text-neutral-900">
                    {order.shippingCost
                      ? money(order.shippingCost, order.currency)
                      : 'FREE'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-neutral-400 uppercase">
                    ESTIMATED TAX
                  </span>
                  <span className="font-medium text-neutral-900">
                    {order.tax ? money(order.tax, order.currency) : '$0.00'}
                  </span>
                </div>

                <div className="pt-2 flex justify-between items-baseline font-black text-sm text-neutral-900 border-t border-neutral-200 mt-2">
                  <span className="uppercase tracking-wider">
                    TOTAL CHARGED
                  </span>
                  <span className="text-base">
                    {money(order.grandTotal || order.total, order.currency)}
                  </span>
                </div>
              </div>

              {/* Barcode & Footer Note */}
              <div className="text-center pt-1 space-y-3">
                {/* SVG Barcode Graphic */}
                <div className="flex justify-center items-center py-1 opacity-80">
                  <svg className="h-10 w-48" viewBox="0 0 190 40">
                    <rect x="0" y="0" width="3" height="40" fill="black" />
                    <rect x="5" y="0" width="1" height="40" fill="black" />
                    <rect x="8" y="0" width="2" height="40" fill="black" />
                    <rect x="13" y="0" width="4" height="40" fill="black" />
                    <rect x="20" y="0" width="1" height="40" fill="black" />
                    <rect x="23" y="0" width="3" height="40" fill="black" />
                    <rect x="28" y="0" width="2" height="40" fill="black" />
                    <rect x="33" y="0" width="1" height="40" fill="black" />
                    <rect x="36" y="0" width="4" height="40" fill="black" />
                    <rect x="43" y="0" width="2" height="40" fill="black" />
                    <rect x="47" y="0" width="1" height="40" fill="black" />
                    <rect x="50" y="0" width="3" height="40" fill="black" />
                    <rect x="56" y="0" width="2" height="40" fill="black" />
                    <rect x="60" y="0" width="4" height="40" fill="black" />
                    <rect x="67" y="0" width="1" height="40" fill="black" />
                    <rect x="70" y="0" width="3" height="40" fill="black" />
                    <rect x="75" y="0" width="2" height="40" fill="black" />
                    <rect x="80" y="0" width="1" height="40" fill="black" />
                    <rect x="83" y="0" width="4" height="40" fill="black" />
                    <rect x="90" y="0" width="2" height="40" fill="black" />
                    <rect x="95" y="0" width="3" height="40" fill="black" />
                    <rect x="100" y="0" width="1" height="40" fill="black" />
                    <rect x="104" y="0" width="4" height="40" fill="black" />
                    <rect x="110" y="0" width="2" height="40" fill="black" />
                    <rect x="114" y="0" width="1" height="40" fill="black" />
                    <rect x="118" y="0" width="3" height="40" fill="black" />
                    <rect x="123" y="0" width="2" height="40" fill="black" />
                    <rect x="128" y="0" width="4" height="40" fill="black" />
                    <rect x="135" y="0" width="1" height="40" fill="black" />
                    <rect x="138" y="0" width="3" height="40" fill="black" />
                    <rect x="143" y="0" width="2" height="40" fill="black" />
                    <rect x="148" y="0" width="1" height="40" fill="black" />
                    <rect x="152" y="0" width="4" height="40" fill="black" />
                    <rect x="158" y="0" width="2" height="40" fill="black" />
                    <rect x="163" y="0" width="3" height="40" fill="black" />
                    <rect x="168" y="0" width="1" height="40" fill="black" />
                    <rect x="172" y="0" width="4" height="40" fill="black" />
                    <rect x="178" y="0" width="2" height="40" fill="black" />
                    <rect x="182" y="0" width="3" height="40" fill="black" />
                  </svg>
                </div>

                <p className="text-[10px] text-neutral-400 font-mono tracking-widest">
                  *{order.orderNumber || order.id}*
                </p>

                <p className="text-[10px] text-neutral-500 leading-normal uppercase font-sans font-medium pt-1">
                  THANK YOU FOR SHOPPING WITH KICKS.
                  <br />
                  ALL RETURNS SUBJECT TO STORE POLICY.
                </p>
              </div>

              {/* Sawtooth / Zig-Zag Physical Tear Edge Effect at Bottom */}
              <div
                className="absolute -bottom-2 inset-x-0 h-2 bg-repeat-x bg-[length:12px_8px]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' width='12' height='8'%3E%3Cpath d='M0 0 l6 8 6-8 z' fill='%23ffffff'/%3E%3C/svg%3E")`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* PROGRESS STEPPER COMPONENT */
function OrderProgressStep({ currentStep }) {
  const steps = [
    { label: 'Order Placed', icon: Clock },
    { label: 'Processing', icon: Package },
    { label: 'In Transit', icon: Truck },
    { label: 'Delivered', icon: CheckCircle2 },
  ];

  return (
    <div className="flex items-center justify-between max-w-2xl mx-auto py-1">
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum <= currentStep;
        const Icon = step.icon;

        return (
          <React.Fragment key={step.label}>
            <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
              <span
                className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition ${
                  isCompleted
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
              >
                <Icon className="size-4" />
              </span>
              <span
                className={`text-xs font-semibold ${
                  isCompleted ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 sm:mx-4 transition ${
                  stepNum < currentStep ? 'bg-slate-900' : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

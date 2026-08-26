import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Package,
  CheckCircle2,
  Truck,
  ChevronRight,
  ArrowRight,
  ShoppingBag,
  User,
  ArrowLeft,
} from 'lucide-react';
import { fetchMyOrders } from '../store/ordersSlice';

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
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  shipped: {
    label: 'Shipped',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
  returned: {
    label: 'Returned',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
};

export default function Orders() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const justPlaced = location.state?.justPlaced;
  const paid = location.state?.paid;

  const { items, loading, error } = useSelector((state) => state.orders);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user) {
      dispatch(fetchMyOrders());
    }
  }, [user, dispatch]);

  if (!user && !justPlaced) {
    return (
      <div className="min-h-[75vh] bg-slate-50/60 py-16 flex items-center justify-center">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-600 border border-slate-200/80">
            <User className="size-6" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">My Orders</h1>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            Please sign in to view your order history, track live shipments, and
            access receipts.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            Sign In <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <Link
                to="/profile"
                className="hover:text-slate-900 transition flex items-center gap-1"
              >
                <ArrowLeft className="size-3" /> Account Overview
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-semibold">
                Order History
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              My Orders
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 shadow-sm">
              {items.length} {items.length === 1 ? 'Order' : 'Orders'} Total
            </span>
            <button
              onClick={() => navigate('/products')}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <ShoppingBag className="size-3.5" /> Catalog
            </button>
          </div>
        </div>

        {/* JUST PLACED ALERT BANNER */}
        {justPlaced && (
          <div className="mt-6 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm transition-all">
            <div className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <CheckCircle2 className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-emerald-950">
                    {paid ? 'Payment Successful!' : 'Order Confirmed!'}
                  </h2>
                  <span className="rounded-md bg-emerald-200/60 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-900">
                    #{justPlaced.orderNumber || justPlaced.id}
                  </span>
                </div>
                <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
                  Order total of{' '}
                  <strong>
                    {money(justPlaced.total || justPlaced.grandTotal)}
                  </strong>{' '}
                  confirmed.
                  {justPlaced.customerEmail &&
                    ` Details sent to ${justPlaced.customerEmail}.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ORDER LIST */}
        <div className="mt-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((key) => (
                <div
                  key={key}
                  className="h-32 animate-pulse rounded-xl bg-slate-200/60"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : items.length === 0 && !justPlaced ? (
            <div className="rounded-xl border border-slate-200 bg-white py-16 text-center shadow-sm">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Package className="size-6" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                No Orders Placed Yet
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Your purchase history is empty. Products you order will appear
                here.
              </p>
              <button
                onClick={() => navigate('/products')}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Start Shopping <ArrowRight className="size-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((order) => {
                const status =
                  statusConfig[order.status] || statusConfig.processing;
                const orderItems = order.items || [];

                return (
                  <article
                    key={order.id}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
                  >
                    {/* SUMMARY HEADER */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/80 px-6 py-4 text-sm border-b border-slate-100">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Order Reference
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            #{order.orderNumber || order.id}
                          </span>
                        </div>
                        <div className="hidden sm:block h-7 w-px bg-slate-200" />
                        <div className="hidden sm:block">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Date Placed
                          </span>
                          <span className="font-medium text-slate-700">
                            {new Date(
                              order.placedAt || order.createdAt
                            ).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold ${status.className}`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${status.dot}`}
                          />
                          {status.label}
                        </span>
                        <span className="text-base font-bold text-slate-900">
                          {money(
                            order.grandTotal || order.total,
                            order.currency
                          )}
                        </span>
                      </div>
                    </div>

                    {/* ITEMS PREVIEW ROW */}
                    <div className="flex items-center justify-between px-6 py-4 bg-white">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex -space-x-2 overflow-hidden">
                          {orderItems.slice(0, 3).map((item, idx) => (
                            <img
                              key={idx}
                              src={imageSrc(item.image || item.productImage)}
                              alt={item.name || item.productName}
                              className="size-11 rounded-md border-2 border-white object-cover bg-slate-100 shadow-xs"
                            />
                          ))}
                        </div>
                        <p className="text-xs font-medium text-slate-600 truncate">
                          {orderItems.length}{' '}
                          {orderItems.length === 1 ? 'item' : 'items'}
                          {orderItems.length > 0 && (
                            <span className="text-slate-400 ml-1">
                              (
                              {orderItems[0]?.name ||
                                orderItems[0]?.productName}
                              )
                            </span>
                          )}
                        </p>
                      </div>

                      <Link
                        to={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition shrink-0 ml-2"
                      >
                        View Order Details <ChevronRight className="size-4" />
                      </Link>
                    </div>

                    {/* FOOTER */}
                    <div className="flex items-center justify-between bg-slate-50/50 px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
                      <span className="flex items-center gap-2">
                        <Truck className="size-3.5 text-slate-400" />
                        {order.trackingNumber
                          ? `${order.courier || 'Courier'}: ${order.trackingNumber}`
                          : 'Status updates automatically'}
                      </span>
                      <Link
                        to={`/orders/${order.id}`}
                        className="font-medium text-slate-700 hover:text-slate-900"
                      >
                        View Receipt
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

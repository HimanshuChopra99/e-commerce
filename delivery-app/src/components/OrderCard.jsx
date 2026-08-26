import Icon from './Icon';

export default function OrderCard({ order, onAccept, onReject }) {
  const isRejected = Boolean(order?.rejected);
  const isCompleted = Boolean(order?.completed);

  // Normalize fields from various API shapes without altering UI layout
  const orderId = order?.id || order?.publicId;
  const orderNumber = order?.orderNumber || order?.order_number || orderId;
  const itemCount =
    order?.items ?? order?.itemCount ?? order?.item_count ?? '?';
  const total =
    order?.total != null ? `$${Number(order.total).toFixed(2)}` : '—';
  const payout = order?.payout
    ? typeof order.payout === 'number'
      ? `$${Number(order.payout).toFixed(2)}`
      : order.payout
    : total;

  const customerName =
    order?.customer ?? order?.customerName ?? order?.customer_name ?? null;

  const addr = order?.shippingAddress || order?.dropoffAddress || {};
  const destination =
    order?.destination ||
    [addr.city, addr.state].filter(Boolean).join(', ') ||
    order?.pickupAddress ||
    'Customer Location';

  // Calculate live distance & ETA if not already provided
  let distance = order?.distance;
  let eta = order?.eta;
  if (!distance || distance === '—') {
    const sLat = Number(addr?.lat);
    const sLng = Number(addr?.lng);
    const pLat = Number(order?.pickupLat ?? 30.7333);
    const pLng = Number(order?.pickupLng ?? 76.7794);
    if (Number.isFinite(sLat) && Number.isFinite(sLng)) {
      const R = 6371;
      const dLat = (sLat - pLat) * (Math.PI / 180);
      const dLon = (sLng - pLng) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(pLat * (Math.PI / 180)) *
          Math.cos(sLat * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const roadKm = Math.max(0.6, R * c * 1.3);
      distance =
        roadKm < 1
          ? `${Math.round(roadKm * 1000)} m`
          : `${roadKm.toFixed(1)} km`;
      eta = `${Math.max(5, Math.round(roadKm * 2.2 + 3))} min`;
    } else {
      distance = '2.8 km';
      eta = '12 min';
    }
  }

  return (
    <article className="bg-surface-container-lowest rounded-[20px] p-md shadow-[0px_4px_20px_0px_rgba(0,0,0,0.04)] border border-surface-container-low flex flex-col gap-sm">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-surface-variant pb-xs">
        <div className="flex items-center gap-xs">
          <span className="text-label-sm text-on-surface-variant">
            Order ID :
          </span>
          <h2 className="text-body-lg font-bold text-on-surface">
            #{orderNumber}
          </h2>
        </div>
        <div className="text-right">
          <div className="text-body-lg font-bold text-primary">{payout}</div>
        </div>
      </div>

      {/* Destination + items */}
      <div className="flex items-center justify-between gap-sm pt-xs pb-xs">
        <div className="flex gap-md items-start min-w-0">
          <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 border-4 border-surface-container-lowest mt-0.5">
            <div className="w-2 h-2 rounded-full bg-outline"></div>
          </div>
          <div className="min-w-0">
            <h3 className="text-body-md font-bold text-on-surface truncate">
              {destination}
            </h3>
            {customerName && (
              <p className="text-label-sm text-on-surface-variant truncate">
                Customer: {customerName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-xs text-on-surface-variant shrink-0">
          <Icon name="inventory_2" className="text-[16px]" />
          <span className="text-label-sm">{itemCount} Items</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-xs bg-surface py-sm px-md rounded-xl mt-xs">
        <div className="flex flex-col items-center justify-center">
          <span className="text-label-sm text-on-surface-variant">
            Distance
          </span>
          <span className="text-body-lg text-on-surface">{distance}</span>
        </div>
        <div className="flex flex-col items-center justify-center border-x border-surface-variant">
          <span className="text-label-sm text-on-surface-variant">
            Est. Time
          </span>
          <span className="text-body-lg text-on-surface">{eta}</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-label-sm text-on-surface-variant">Payout</span>
          <span className="text-body-lg text-primary">{payout}</span>
        </div>
      </div>

      {/* Actions */}
      {isCompleted ? (
        <div className="flex gap-sm mt-xs">
          <button
            disabled
            className="flex-1 bg-surface-container-highest text-on-surface-variant rounded-xl py-2 text-label-lg cursor-default"
          >
            Delivered
          </button>
        </div>
      ) : (
        <div className="flex gap-sm mt-xs">
          <button
            onClick={() => onReject(orderId)}
            disabled={isRejected}
            className={`flex-1 border rounded-xl py-2 text-label-lg transition-colors ${
              isRejected
                ? 'border-error-container bg-error-container text-on-error-container cursor-default'
                : 'border-outline-variant text-on-surface hover:bg-surface-container-low'
            }`}
          >
            {isRejected ? 'Rejected' : 'Reject'}
          </button>
          <button
            onClick={() => onAccept(orderId)}
            disabled={isRejected}
            className={`flex-1 bg-primary text-on-primary rounded-xl py-2 text-label-lg hover:bg-surface-tint transition-colors ${
              isRejected ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Accept
          </button>
        </div>
      )}
    </article>
  );
}

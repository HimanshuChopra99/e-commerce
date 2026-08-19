import Icon from './Icon'

export default function OrderCard({ order, onAccept, onReject }) {
  const isRejected = order.rejected
  const isCompleted = order.completed

  return (
    <article className="bg-surface-container-lowest rounded-[20px] p-md shadow-[0px_4px_20px_0px_rgba(0,0,0,0.04)] border border-surface-container-low flex flex-col gap-sm">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-surface-variant pb-xs">
        <div className="flex items-center gap-xs">
          <span className="text-label-sm text-on-surface-variant">Order ID :</span>
          <h2 className="text-body-lg font-bold text-on-surface">#{order.id}</h2>
        </div>
        <div className="text-right">
          <div className="text-body-lg font-bold text-primary">{order.payout}</div>
        </div>
      </div>

      {/* Destination + items */}
      <div className="flex items-center justify-between gap-sm pt-xs pb-xs">
        <div className="flex gap-md items-start min-w-0">
          <div className="w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center shrink-0 border-4 border-surface-container-lowest mt-0.5">
            <div className="w-2 h-2 rounded-full bg-outline"></div>
          </div>
          <div className="min-w-0">
            <h3 className="text-body-md font-bold text-on-surface truncate">{order.destination}</h3>
            {order.customer && <p className="text-label-sm text-on-surface-variant truncate">Customer: {order.customer}</p>}
          </div>
        </div>
        <div className="flex items-center gap-xs text-on-surface-variant shrink-0">
          <Icon name="inventory_2" className="text-[16px]" />
          <span className="text-label-sm">{order.items} Items</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-xs bg-surface py-sm px-md rounded-xl mt-xs">
        <div className="flex flex-col items-center justify-center">
          <span className="text-label-sm text-on-surface-variant">Distance</span>
          <span className="text-body-lg text-on-surface">{order.distance}</span>
        </div>
        <div className="flex flex-col items-center justify-center border-x border-surface-variant">
          <span className="text-label-sm text-on-surface-variant">Est. Time</span>
          <span className="text-body-lg text-on-surface">{order.eta}</span>
        </div>
        <div className="flex flex-col items-center justify-center">
          <span className="text-label-sm text-on-surface-variant">Payout</span>
          <span className="text-body-lg text-primary">{order.payout}</span>
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
            onClick={() => onReject(order.id)}
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
            onClick={() => onAccept(order.id)}
            className="flex-1 bg-primary text-on-primary rounded-xl py-2 text-label-lg hover:bg-surface-tint transition-colors"
          >
            Accept
          </button>
        </div>
      )}
    </article>
  )
}

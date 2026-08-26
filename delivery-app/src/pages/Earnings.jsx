import { useSelector } from 'react-redux';
import Icon from '../components/Icon';

function TopAppBar() {
  return (
    <header className="bg-surface dark:bg-on-background docked full-width top-0 sticky z-40">
      <div className="flex justify-between items-center w-full px-margin-mobile h-14">
        <button className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-surface-variant transition-all duration-200 active:opacity-70 text-on-surface-variant dark:text-outline-variant">
          <Icon name="arrow_back" />
        </button>
        <h1 className="text-headline-md font-bold text-on-surface dark:text-on-background">
          Earnings
        </h1>
        <button className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-container-low dark:hover:bg-surface-variant transition-all duration-200 active:opacity-70 text-on-surface-variant dark:text-outline-variant">
          <Icon name="more_horiz" />
        </button>
      </div>
    </header>
  );
}

function formatMoney(n) {
  const v = Number(n) || 0;
  return `$${v.toFixed(2)}`;
}

function DashboardGrid() {
  const stats = useSelector((s) => s.app.stats) || {};

  return (
    <section className="flex flex-col gap-md">
      {/* Total Earnings hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[#7b46e0] to-[#9a6bff] text-white shadow-lg shadow-primary/25 p-md">
        <div className="absolute -right-8 -top-10 w-36 h-36 rounded-full bg-white/10"></div>
        <div className="absolute right-16 -bottom-12 w-28 h-28 rounded-full bg-white/5"></div>
        <div className="absolute right-24 top-10 opacity-10">
          <Icon name="account_balance_wallet" fill className="text-[90px]" />
        </div>

        <div className="relative z-10 flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-xs opacity-90">
              <Icon
                name="account_balance_wallet"
                fill
                className="text-label-lg"
              />
              <h2 className="text-label-sm uppercase tracking-wider">
                Total Earnings
              </h2>
            </div>
            <span className="text-label-sm bg-white/20 backdrop-blur px-2 py-0.5 rounded-full font-semibold">
              All Time
            </span>
          </div>

          <div className="flex items-baseline gap-xs">
            <span className="text-[34px] leading-none font-bold tracking-tight">
              {formatMoney(stats.earnings)}
            </span>
          </div>

          <div className="mt-1">
            <div className="flex justify-between text-label-sm mb-1 opacity-90">
              <span>Today</span>
              <span className="font-semibold">
                {formatMoney(stats.earningsToday)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Delivered */}
        <div className="bg-surface-container-lowest rounded-2xl p-3 border border-surface-container-highest shadow-sm flex flex-col">
          <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
            <Icon name="pedal_bike" fill className="text-[18px]" />
          </div>
          <span className="mt-2.5 text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide">
            Deliveries
          </span>
          <span className="mt-1 text-xl font-bold text-on-surface tabular-nums">
            {stats.deliveredCount ?? 0}
          </span>
          <span className="mt-1.5 text-[11px] text-on-surface-variant">
            Completed
          </span>
        </div>

        {/* In transit */}
        <div className="bg-surface-container-lowest rounded-2xl p-3 border border-surface-container-highest shadow-sm flex flex-col">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
            <Icon name="local_shipping" fill className="text-[18px]" />
          </div>
          <span className="mt-2.5 text-[10px] font-semibold text-on-surface-variant uppercase tracking-wide">
            In Transit
          </span>
          <span className="mt-1 text-xl font-bold text-on-surface tabular-nums">
            {stats.inTransitCount ?? 0}
          </span>
          <span className="mt-1.5 text-[11px] text-on-surface-variant">
            Active
          </span>
        </div>
      </div>
    </section>
  );
}

function DeliveryHistory() {
  const orders = useSelector((s) => s.app.recentOrders) || [];

  return (
    <section className="flex flex-col gap-md">
      <div className="flex justify-between items-center">
        <h3 className="text-headline-md text-on-surface">Delivery History</h3>
      </div>
      <div className="bg-surface-container-lowest rounded-xl shadow-[0px_4px_20px_0px_rgba(0,0,0,0.04)] overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-lg text-center">
            <p className="text-body-md text-on-surface-variant">
              No deliveries yet.
            </p>
          </div>
        ) : (
          <ul className="divide-surface-variant">
            {orders.map((d) => (
              <li
                key={d.id || d.orderNumber}
                className="p-md hover:bg-surface-container-low transition-colors duration-150 cursor-pointer flex items-center justify-between border-b border-surface-container last:border-0"
              >
                <div className="flex items-center gap-md">
                  <div className="w-11 h-11 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                    <Icon name="local_shipping" fill />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-body-lg font-bold text-on-surface">
                      Order {d.orderNumber}
                    </span>
                    <span className="text-label-sm text-on-surface-variant capitalize">
                      {d.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-body-lg font-bold text-on-surface">
                    {formatMoney(d.payout)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function Earnings() {
  return (
    <div className="min-h-screen bg-background text-on-background font-body-md antialiased pb-28">
      <TopAppBar />
      <main className="px-margin-mobile pt-md pb-xl max-w-7xl mx-auto flex flex-col gap-lg">
        <DashboardGrid />
        <DeliveryHistory />
      </main>
    </div>
  );
}
